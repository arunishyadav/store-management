package com.finsen.store.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finsen.store.dto.*;
import com.finsen.store.entity.Location;
import com.finsen.store.entity.Material;
import com.finsen.store.entity.StockEntry;
import com.finsen.store.repository.LocationRepository;
import com.finsen.store.repository.MaterialRepository;
import com.finsen.store.repository.StockEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AiChatService {

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private StockEntryRepository stockEntryRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Value("${app.ollama.url:http://localhost:11434}")
    private String ollamaUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public OllamaStatusResponse checkOllamaStatus() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ollamaUrl + "/api/tags"))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                Map<String, Object> map = objectMapper.readValue(response.body(), new TypeReference<>() {});
                List<Map<String, Object>> modelsList = (List<Map<String, Object>>) map.get("models");
                List<String> modelNames = new ArrayList<>();
                if (modelsList != null) {
                    for (Map<String, Object> m : modelsList) {
                        modelNames.add((String) m.get("name"));
                    }
                }
                String defaultModel = modelNames.isEmpty() ? "llama3.2" : modelNames.get(0);
                return new OllamaStatusResponse(true, modelNames, defaultModel);
            }
        } catch (Exception ignored) {}
        return new OllamaStatusResponse(false, List.of("llama3.2", "qwen2.5", "mistral"), "llama3.2");
    }

    public ChatResponse processChat(ChatRequest request) {
        String userQuery = request.message() != null ? request.message().trim() : "";
        if (userQuery.isEmpty()) {
            return new ChatResponse("Kripya apna sawal poochein, jaise 'Cement kitna store me bacha hai?'", false, List.of(), "system", "none");
        }

        // Fetch Live Inventory Data
        List<Material> allMaterials = materialRepository.findAll();
        List<StockEntry> allStockEntries = stockEntryRepository.findAll();
        List<Location> allLocations = locationRepository.findAll();

        // Determine Active Location
        UUID activeLocId = request.locationId();
        String activeLocName = request.locationName();

        if (activeLocId != null) {
            for (Location loc : allLocations) {
                if (loc.getId().equals(activeLocId)) {
                    activeLocName = loc.getName();
                    break;
                }
            }
        } else if (activeLocName != null && !activeLocName.isBlank()) {
            for (Location loc : allLocations) {
                if (loc.getName().equalsIgnoreCase(activeLocName.trim())) {
                    activeLocId = loc.getId();
                    activeLocName = loc.getName();
                    break;
                }
            }
        }

        final UUID targetLocId = activeLocId;
        final String targetLocName = (activeLocName != null && !activeLocName.isBlank()) ? activeLocName.trim() : "Current Location";

        // Build structured inventory context for Active Location vs Other Locations
        Map<String, Map<String, Object>> activeLocSummary = new LinkedHashMap<>();
        Map<String, Map<String, Object>> otherLocSummary = new LinkedHashMap<>();

        final boolean isAllLocations = (targetLocId == null && (request.locationName() == null || request.locationName().isBlank() || request.locationName().equalsIgnoreCase("All Locations")));

        // Pre-populate materials in active location (so 0 stock items are explicitly registered)
        for (Material m : allMaterials) {
            boolean isCurrentLocMaterial = isAllLocations || isLocationMatch(m.getLocation(), targetLocId, targetLocName);

            if (isCurrentLocMaterial) {
                String fullKey = m.getName();
                activeLocSummary.computeIfAbsent(fullKey, k -> createEmptyItemData(m, targetLocName));
            }
        }

        for (StockEntry entry : allStockEntries) {
            if (entry.getMaterial() == null) continue;
            String matName = entry.getMaterial().getName();
            String specKey = buildSpecKey(entry);
            String fullItemKey = matName + (specKey.isEmpty() ? "" : " (" + specKey + ")");

            boolean isCurrentLoc = isAllLocations || 
                                   isLocationMatch(entry.getLocation(), targetLocId, targetLocName) || 
                                   isLocationMatch(entry.getMaterial().getLocation(), targetLocId, targetLocName);

            Map<String, Map<String, Object>> targetMap = isCurrentLoc ? activeLocSummary : otherLocSummary;
            String entryLocName = entry.getLocation() != null ? entry.getLocation().getName() : (isCurrentLoc ? targetLocName : "Other Store");

            double arrival = entry.getArrivalQuantity() != null ? entry.getArrivalQuantity() : 0.0;
            double outgoing = entry.getOutgoingQuantity() != null ? entry.getOutgoingQuantity() : 0.0;
            double available = entry.getTotalAvailableQty() != null ? entry.getTotalAvailableQty() : (arrival - outgoing);

            String arrDateStr = entry.getArrivalDate() != null ? entry.getArrivalDate().toString() : null;
            String issDateStr = entry.getIssueDate() != null ? entry.getIssueDate().toString() : null;

            Map<String, Object> itemData = targetMap.computeIfAbsent(fullItemKey, k -> createEmptyItemData(entry.getMaterial(), entryLocName));

            itemData.put("totalArrival", (double) itemData.get("totalArrival") + arrival);
            itemData.put("totalOutgoing", (double) itemData.get("totalOutgoing") + outgoing);
            itemData.put("totalStock", (double) itemData.get("totalStock") + available);

            Set<String> arrDates = (Set<String>) itemData.get("arrivalDates");
            if (arrDateStr != null) {
                arrDates.add(arrDateStr);
            }

            List<String> arrHist = (List<String>) itemData.get("arrivalHistory");
            if (arrival > 0) {
                String desc = String.format("Aaya: %.1f %s | Date: %s%s", arrival, entry.getMaterial().getUnit(), (arrDateStr != null ? arrDateStr : "Date mention nahi hai"), (entry.getBroughtBy() != null && !entry.getBroughtBy().isBlank() ? " | Brought By: " + entry.getBroughtBy() : ""));
                arrHist.add(desc);
            }

            List<String> outHist = (List<String>) itemData.get("outgoingHistory");
            if (outgoing > 0) {
                String desc = String.format("Out hua: %.1f %s | Date: %s%s", outgoing, entry.getMaterial().getUnit(), (issDateStr != null ? issDateStr : "Date mention nahi hai"), (entry.getIssuedBy() != null && !entry.getIssuedBy().isBlank() ? " | Issued By: " + entry.getIssuedBy() : ""));
                outHist.add(desc);
            }
        }

        String modelToUse = (request.model() != null && !request.model().isBlank()) ? request.model() : "llama3.2";

        // Attempt Ollama Call
        OllamaStatusResponse status = checkOllamaStatus();
        if (status.connected()) {
            try {
                ChatResponse ollamaResponse = callOllamaApi(userQuery, request.history(), activeLocSummary, otherLocSummary, targetLocName, modelToUse);
                if (ollamaResponse != null) {
                    return ollamaResponse;
                }
            } catch (Exception e) {
                System.err.println("Ollama call failed, using smart fallback: " + e.getMessage());
            }
        }

        // Smart Fallback Engine (Native RAG Response with Strict Location Scoping)
        return executeSmartFallback(userQuery, activeLocSummary, otherLocSummary, targetLocName);
    }

    private boolean isLocationMatch(Location loc, UUID targetId, String targetName) {
        if (loc == null) return false;
        if (targetId != null && targetId.equals(loc.getId())) return true;
        if (targetName != null && !targetName.isBlank() && loc.getName() != null && loc.getName().equalsIgnoreCase(targetName.trim())) return true;
        return false;
    }

    private Map<String, Object> createEmptyItemData(Material material, String locationName) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("materialName", material.getName());
        map.put("category", material.getCategory());
        map.put("unit", material.getUnit() != null ? material.getUnit() : "Units");
        map.put("specifications", "");
        map.put("innerDiameter", "");
        map.put("productLength", "");
        map.put("kg", "");
        map.put("totalArrival", 0.0);
        map.put("totalOutgoing", 0.0);
        map.put("totalStock", 0.0);
        map.put("arrivalDates", new LinkedHashSet<String>());
        map.put("arrivalHistory", new ArrayList<String>());
        map.put("outgoingHistory", new ArrayList<String>());
        map.put("location", locationName);
        return map;
    }

    private String buildSpecKey(StockEntry entry) {
        List<String> parts = new ArrayList<>();
        if (entry.getInnerDiameter() != null && !entry.getInnerDiameter().equalsIgnoreCase("NA") && !entry.getInnerDiameter().isBlank()) {
            parts.add("Size/Diameter: " + entry.getInnerDiameter());
        }
        if (entry.getProductLength() != null && !entry.getProductLength().equalsIgnoreCase("NA") && !entry.getProductLength().isBlank()) {
            parts.add("Length: " + entry.getProductLength());
        }
        if (entry.getKg() != null && !entry.getKg().equalsIgnoreCase("NA") && !entry.getKg().isBlank()) {
            parts.add("Weight: " + entry.getKg());
        }
        return String.join(", ", parts);
    }

    private ChatResponse callOllamaApi(String userQuery, List<Map<String, String>> history, Map<String, Map<String, Object>> activeLocSummary, Map<String, Map<String, Object>> otherLocSummary, String activeLocName, String model) throws Exception {
        String systemPrompt = """
                You are Finsen Store AI, an intelligent Store Management Assistant.
                You help store managers check material stock, availability, arrival history, outgoing transactions, and inventory details in Hinglish, Hindi, or English.

                CRITICAL LOCATION SCOPING RULE:
                - The user is currently logged in at ACTIVE LOCATION: %s.
                - You MUST check and report stock for ACTIVE LOCATION (%s) FIRST.
                - IF AN ITEM IS NOT AVAILABLE OR HAS 0 QUANTITY IN %s:
                  Explicitly state: "%s location me [Item] ka stock available nahi hai (Quantity: 0)."
                  If that item has stock in another location, you may add: "Dusre location ([Location Name]) me [Quantity] available hai."
                - DO NOT attribute stock from another location as belonging to %s!

                LIVE INVENTORY DATA FOR ACTIVE LOCATION (%s):
                %s

                OTHER LOCATIONS INVENTORY (REFERENCE ONLY IF ITEM IS 0 IN ACTIVE LOCATION):
                %s

                IMPORTANT INSTRUCTIONS FOR YOUR RESPONSE:
                1. Always answer politely in Hinglish (mixed Hindi + English) or the exact language user asked.
                2. CLARIFICATION QUESTION RULE: If the user's question is vague (e.g. asking for "pipe", "nojal", "wire", "flange", or "accessories" without specifying size/diameter), ask a friendly clarifying question listing options available in %s!
                3. SPECIFIC ITEM RULE: State exact stock for %s first. If 0, state it is 0 in %s and list other locations.
                4. ARRIVAL & OUTGOING HISTORY RULE: Report Arrival Date (or "Date mention nahi hai" if missing), Total Aaya, Total Out Hua, and Total Bacha Stock.
                5. Keep responses concise, direct, helpful, and formatted with clean bullet points.
                """.formatted(
                        activeLocName, activeLocName, activeLocName, activeLocName, activeLocName, activeLocName,
                        objectMapper.writeValueAsString(activeLocSummary),
                        objectMapper.writeValueAsString(otherLocSummary),
                        activeLocName, activeLocName, activeLocName
                );

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        if (history != null) {
            for (Map<String, String> h : history) {
                if (h.containsKey("role") && h.containsKey("content")) {
                    messages.add(Map.of("role", h.get("role"), "content", h.get("content")));
                }
            }
        }
        messages.add(Map.of("role", "user", "content", userQuery));

        Map<String, Object> reqBody = new HashMap<>();
        reqBody.put("model", model);
        reqBody.put("messages", messages);
        reqBody.put("stream", false);

        String jsonBody = objectMapper.writeValueAsString(reqBody);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(ollamaUrl + "/api/chat"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(12))
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (httpResponse.statusCode() == 200) {
            Map<String, Object> respMap = objectMapper.readValue(httpResponse.body(), new TypeReference<>() {});
            Map<String, Object> messageMap = (Map<String, Object>) respMap.get("message");
            if (messageMap != null && messageMap.containsKey("content")) {
                String reply = (String) messageMap.get("content");
                boolean needsClarification = reply.toLowerCase().contains("kon sa") || reply.toLowerCase().contains("kis size") || reply.toLowerCase().contains("multiple types");
                return new ChatResponse(reply, needsClarification, extractOptions(reply, activeLocSummary), "ollama", model);
            }
        }
        return null;
    }

    private ChatResponse executeSmartFallback(String query, Map<String, Map<String, Object>> activeLocSummary, Map<String, Map<String, Object>> otherLocSummary, String activeLocName) {
        String lowerQuery = query.toLowerCase();

        // 1. Search in active location summary
        List<Map.Entry<String, Map<String, Object>>> activeMatches = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : activeLocSummary.entrySet()) {
            String fullKey = entry.getKey().toLowerCase();
            String matName = ((String) entry.getValue().get("materialName")).toLowerCase();
            String cat = ((String) entry.getValue().get("category")).toLowerCase();

            if (lowerQuery.contains(matName) || lowerQuery.contains(cat) || fullKey.contains(lowerQuery) || isKeywordMatch(lowerQuery, matName)) {
                activeMatches.add(entry);
            }
        }

        // 2. Search in other locations summary
        List<Map.Entry<String, Map<String, Object>>> otherMatches = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : otherLocSummary.entrySet()) {
            String fullKey = entry.getKey().toLowerCase();
            String matName = ((String) entry.getValue().get("materialName")).toLowerCase();
            String cat = ((String) entry.getValue().get("category")).toLowerCase();

            if (lowerQuery.contains(matName) || lowerQuery.contains(cat) || fullKey.contains(lowerQuery) || isKeywordMatch(lowerQuery, matName)) {
                otherMatches.add(entry);
            }
        }

        if (activeMatches.isEmpty() && otherMatches.isEmpty()) {
            StringBuilder sb = new StringBuilder(String.format("📍 **%s** Store me maujood material summary:\n", activeLocName));
            for (Map.Entry<String, Map<String, Object>> e : activeLocSummary.entrySet()) {
                sb.append("• ").append(e.getKey()).append(" (Stock: ").append(e.getValue().get("totalStock")).append(" ").append(e.getValue().get("unit")).append(")\n");
            }
            sb.append("\nAap kisi specific material (jaise Cement, Nojal, Winding Wire) ke baare me pooch sakte hain!");
            return new ChatResponse(sb.toString(), false, List.of(), "smart-fallback", "rule-engine");
        }

        // Check clarification needed if multiple active matches exist with > 0 stock
        List<Map.Entry<String, Map<String, Object>>> activeWithStock = activeMatches.stream().filter(e -> (double) e.getValue().get("totalStock") > 0).toList();
        if (activeWithStock.size() > 1) {
            List<String> options = activeWithStock.stream().map(Map.Entry::getKey).collect(Collectors.toList());
            StringBuilder reply = new StringBuilder(String.format("📍 **%s** store me multiple types/sizes maujood hain. Aapko kis item ka stock check karna hai?\n\n", activeLocName));
            for (int i = 0; i < activeWithStock.size(); i++) {
                reply.append(i + 1).append(". ").append(activeWithStock.get(i).getKey()).append("\n");
            }
            return new ChatResponse(reply.toString(), true, options, "smart-fallback", "rule-engine");
        }

        // Case A: Item found in Active Location
        if (!activeMatches.isEmpty()) {
            Map.Entry<String, Map<String, Object>> singleMatch = activeMatches.get(0);
            String itemName = singleMatch.getKey();
            double stock = (double) singleMatch.getValue().get("totalStock");
            double arrival = (double) singleMatch.getValue().get("totalArrival");
            double outgoing = (double) singleMatch.getValue().get("totalOutgoing");
            String unit = (String) singleMatch.getValue().get("unit");
            Set<String> arrDates = (Set<String>) singleMatch.getValue().get("arrivalDates");
            List<String> arrHist = (List<String>) singleMatch.getValue().get("arrivalHistory");
            List<String> outHist = (List<String>) singleMatch.getValue().get("outgoingHistory");

            StringBuilder reply = new StringBuilder();

            if (stock > 0 || arrival > 0) {
                reply.append(String.format("📊 **%s** (Location: **%s**):\n\n", itemName, activeLocName));
                if (arrDates.isEmpty()) {
                    reply.append("⚠️ **Arrival Date**: Date mention nahi hai.\n");
                } else {
                    reply.append(String.format("📅 **Arrival Date(s)**: %s\n", String.join(", ", arrDates)));
                }
                reply.append(String.format("📥 **Total Aaya (Arrival)**: %.1f %s\n", arrival, unit));
                if (!arrHist.isEmpty()) {
                    for (String h : arrHist) reply.append("   • ").append(h).append("\n");
                }
                reply.append(String.format("📤 **Total Out Hua (Outgoing)**: %.1f %s\n", outgoing, unit));
                if (!outHist.isEmpty()) {
                    for (String h : outHist) reply.append("   • ").append(h).append("\n");
                }
                reply.append(String.format("\n📦 **Available Stock in %s**: **%.1f %s**", activeLocName, stock, unit));
            } else {
                // Total Stock is 0 in Active Location!
                reply.append(String.format("❌ **%s** location me **%s** ka stock available nahi hai (Total Quantity: **0 %s**).\n", activeLocName, itemName, unit));

                // Check if other locations have stock!
                double otherTotalStock = 0.0;
                List<String> otherDetails = new ArrayList<>();
                for (Map.Entry<String, Map<String, Object>> om : otherMatches) {
                    double ost = (double) om.getValue().get("totalStock");
                    String oloc = (String) om.getValue().get("location");
                    String ounit = (String) om.getValue().get("unit");
                    if (ost > 0) {
                        otherTotalStock += ost;
                        otherDetails.add(String.format("• **%s**: %.1f %s", oloc, ost, ounit));
                    }
                }
                if (otherTotalStock > 0) {
                    reply.append("\nℹ️ **Dusre Locations me available stock**:\n");
                    for (String od : otherDetails) {
                        reply.append(od).append("\n");
                    }
                }
            }
            return new ChatResponse(reply.toString(), false, List.of(), "smart-fallback", "rule-engine");
        }

        // Case B: Item not in active location, but present in other location
        Map.Entry<String, Map<String, Object>> otherMatch = otherMatches.get(0);
        String itemName = ((String) otherMatch.getValue().get("materialName"));
        String unit = (String) otherMatch.getValue().get("unit");

        StringBuilder reply = new StringBuilder();
        reply.append(String.format("❌ **%s** location me **%s** ka stock available nahi hai (Total Quantity: **0 %s**).\n", activeLocName, itemName, unit));

        reply.append("\nℹ️ **Dusre Locations me available stock**:\n");
        for (Map.Entry<String, Map<String, Object>> om : otherMatches) {
            double ost = (double) om.getValue().get("totalStock");
            String oloc = (String) om.getValue().get("location");
            String ounit = (String) om.getValue().get("unit");
            if (ost > 0) {
                reply.append(String.format("• **%s**: %.1f %s\n", oloc, ost, ounit));
            }
        }

        return new ChatResponse(reply.toString(), false, List.of(), "smart-fallback", "rule-engine");
    }

    private boolean isKeywordMatch(String query, String matName) {
        if (query.contains("cement") && matName.contains("cement")) return true;
        if ((query.contains("pipe") || query.contains("nojal")) && (matName.contains("nojal") || matName.contains("pipe"))) return true;
        if (query.contains("flange") && matName.contains("flange")) return true;
        if (query.contains("wire") && matName.contains("wire")) return true;
        if (query.contains("goggles") && matName.contains("goggles")) return true;
        if (query.contains("accessories") && matName.contains("accessories")) return true;
        return false;
    }

    private List<String> extractOptions(String reply, Map<String, Map<String, Object>> inventorySummary) {
        List<String> options = new ArrayList<>();
        for (String key : inventorySummary.keySet()) {
            if (reply.toLowerCase().contains(key.toLowerCase())) {
                options.add(key);
            }
        }
        return options;
    }
}
