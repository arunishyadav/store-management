package com.finsen.store.service;

import com.finsen.store.entity.Location;
import com.finsen.store.entity.Material;
import com.finsen.store.entity.StockEntry;
import com.finsen.store.repository.LocationRepository;
import com.finsen.store.repository.MaterialRepository;
import com.finsen.store.repository.StockEntryRepository;
import com.finsen.store.repository.TrashItemRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import com.finsen.store.entity.User;

@Service
public class StockEntryService {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(StockEntryService.class);

    private final StockEntryRepository stockEntryRepository;
    private final MaterialRepository materialRepository;
    private final LocationRepository locationRepository;
    private final TrashItemRepository trashItemRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final EmailService emailService;
    private final org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @Autowired
    public StockEntryService(StockEntryRepository stockEntryRepository, MaterialRepository materialRepository, LocationRepository locationRepository, TrashItemRepository trashItemRepository, SimpMessagingTemplate messagingTemplate, EmailService emailService, org.springframework.transaction.PlatformTransactionManager transactionManager) {
        this.stockEntryRepository = stockEntryRepository;
        this.materialRepository = materialRepository;
        this.locationRepository = locationRepository;
        this.trashItemRepository = trashItemRepository;
        this.messagingTemplate = messagingTemplate;
        this.emailService = emailService;
        this.transactionTemplate = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        // PostConstruct skipped to avoid running recalculation before DB seeding
    }

    @Transactional(readOnly = true)
    public List<StockEntry> getAllEntries() {
        if (entityManager != null) {
            try {
                entityManager.clear();
            } catch (Exception ignored) {}
        }
        return stockEntryRepository.findAllWithDetails();
    }

    @Transactional(readOnly = true)
    public List<StockEntry> getEntriesByLocation(UUID locationId) {
        if (entityManager != null) {
            try {
                entityManager.clear();
            } catch (Exception ignored) {}
        }
        if (locationId == null) {
            return stockEntryRepository.findAllWithDetails();
        }
        return stockEntryRepository.findByLocationIdWithDetails(locationId);
    }

    @Transactional
    public StockEntry createOrUpdateEntry(StockEntry entry) {
        // Validate material association
        Material material = null;
        if (entry.getMaterial() != null && entry.getMaterial().getId() != null) {
            try {
                material = materialRepository.findById(entry.getMaterial().getId()).orElse(null);
            } catch(Exception ignored) {}
        }
        
        if (material == null) {
            String searchStr = null;
            if (entry.getMaterial() != null) {
                if (entry.getMaterial().getMaterialCode() != null && !entry.getMaterial().getMaterialCode().trim().isEmpty()) {
                    searchStr = entry.getMaterial().getMaterialCode().trim();
                } else if (entry.getMaterial().getName() != null && !entry.getMaterial().getName().trim().isEmpty()) {
                    searchStr = entry.getMaterial().getName().trim();
                }
            }
            
            if (searchStr != null) {
                String normSearch = searchStr.toLowerCase().replace("bound", "bond").replace("glinder", "grinder").replace("while", "wheel").replaceAll("[^a-z0-9]", "").replaceAll("\\d{6,8}$", "");
                List<Material> allMats = materialRepository.findAll();
                List<Material> matches = new java.util.ArrayList<>();
                for (Material m : allMats) {
                    String mCode = m.getMaterialCode() != null ? m.getMaterialCode().toLowerCase().replace("bound", "bond").replace("glinder", "grinder").replace("while", "wheel").replaceAll("[^a-z0-9]", "") : "";
                    String mName = m.getName() != null ? m.getName().toLowerCase().replace("bound", "bond").replace("glinder", "grinder").replace("while", "wheel").replaceAll("[^a-z0-9]", "") : "";
                    if (!normSearch.isEmpty() && ((!mCode.isEmpty() && (mCode.equals(normSearch) || normSearch.contains(mCode) || mCode.contains(normSearch))) ||
                        (!mName.isEmpty() && (mName.equals(normSearch) || normSearch.contains(mName) || mName.contains(normSearch))))) {
                        matches.add(m);
                    }
                }
                
                if (!matches.isEmpty()) {
                    material = matches.stream().max(java.util.Comparator.comparingDouble(m -> {
                        List<StockEntry> se = stockEntryRepository.findByMaterialId(m.getId());
                        if (se == null) return 0.0;
                        return se.stream().mapToDouble(e -> e.getArrivalQuantity() != null ? e.getArrivalQuantity() : 0.0).sum();
                    })).orElse(matches.get(0));
                }
            }
        }

        if (material == null) {
            material = materialRepository.findAll().stream().findFirst().orElseThrow(() -> new RuntimeException("Material not found"));
        }
        
        // Safely resolve location association
        Location location = null;
        if (entry.getLocation() != null && entry.getLocation().getId() != null) {
            try {
                location = locationRepository.findById(entry.getLocation().getId()).orElse(null);
            } catch (Exception ignored) {}
        }
        if (location == null && material.getLocation() != null) {
            location = material.getLocation();
        }
        if (location == null) {
            try {
                User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                if (currentUser != null && currentUser.getLocation() != null) {
                    location = currentUser.getLocation();
                }
            } catch (Exception ignored) {}
        }
        if (location == null) {
            location = locationRepository.findAll().stream().findFirst().orElseThrow(() -> new RuntimeException("Location not found"));
        }
        
        double arrInput = entry.getArrivalQuantity() != null ? entry.getArrivalQuantity() : 0.0;
        double outInput = entry.getOutgoingQuantity() != null ? entry.getOutgoingQuantity() : 0.0;
        logger.info(">>> CREATE_OR_UPDATE_ENTRY CALLED: mat={} | out={} | arr={}", material.getId(), outInput, arrInput);
        if (outInput > 0.0) {
            entry.setArrivalQuantity(0.0);
            if (entry.getIssueTime() == null) {
                entry.setIssueTime(java.time.LocalTime.now());
            }
        } else if (arrInput > 0.0) {
            entry.setOutgoingQuantity(0.0);
            if (entry.getArrivalTime() == null) {
                entry.setArrivalTime(java.time.LocalTime.now());
            }
        }

        entry.setMaterial(material);
        entry.setLocation(location);
        
        boolean isUpdate = entry.getId() != null;
        
        StockEntry savedEntry = stockEntryRepository.save(entry);
        
        // Universal Store Balance Recalculation across all rows for this material in DB
        double newBalance = recalculateMaterialStockBalance(material.getId(), location.getId());
        logger.info(">>> RECALCULATED NEW_BALANCE: {}", newBalance);
        
        // Explicitly update returned entity with the calculated universal balance
        savedEntry.setTotalAvailableQty(newBalance);
        savedEntry.setAvailableInStore(newBalance > 0 ? "YES" : "NO");
        savedEntry = stockEntryRepository.save(savedEntry);
        stockEntryRepository.flush();
        
        // Notify via WebSocket
        try {
            messagingTemplate.convertAndSend("/topic/location/" + location.getId(), "STOCK_UPDATED");
        } catch(Exception ignored) {}
        
        if (isUpdate) {
            try {
                User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                String dataDetails = "Entry ID: " + savedEntry.getId() + "\nBill No: " + savedEntry.getBillNumber() + "\nQuantity: " + savedEntry.getArrivalQuantity();
                emailService.sendAuditEmail(currentUser, "UPDATED", dataDetails, location.getName());
            } catch(Exception e) {}
        }
        
        return savedEntry;
    }

    @Transactional
    public void deleteEntry(UUID id) {
        stockEntryRepository.findById(id).ifPresent(entry -> {
            UUID materialId = entry.getMaterial() != null ? entry.getMaterial().getId() : null;
            UUID locationId = entry.getLocation() != null ? entry.getLocation().getId() : null;
            String locationName = entry.getLocation() != null ? entry.getLocation().getName() : "Unknown";
            String dataDetails = "Deleted Entry Bill No: " + entry.getBillNumber() + "\nMaterial: " + (entry.getMaterial() != null ? entry.getMaterial().getName() : "N/A");
            
            String deletedBy = "System";
            try {
                org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getPrincipal() instanceof User) {
                    User u = (User) auth.getPrincipal();
                    deletedBy = u.getFullName() != null && !u.getFullName().trim().isEmpty() ? u.getFullName() : u.getUsername();
                } else if (auth != null && auth.getName() != null) {
                    deletedBy = auth.getName();
                }
            } catch (Exception ignored) {}

            // Soft-delete the entry
            entry.setDeleted(true);
            entry.setDeletedAt(java.time.LocalDateTime.now());
            entry.setDeletedBy(deletedBy);
            stockEntryRepository.save(entry);

            // Create TrashItem record
            try {
                com.finsen.store.entity.TrashItem trashItem = new com.finsen.store.entity.TrashItem();
                trashItem.setSourceModule("ENTRY_BOOK");
                trashItem.setOriginalRecordId(entry.getId().toString());
                if (entry.getMaterial() != null) {
                    trashItem.setMaterialCode(entry.getMaterial().getMaterialCode());
                    trashItem.setMaterialName(entry.getMaterial().getName());
                    trashItem.setUnit(entry.getMaterial().getUnit());
                }
                double out = entry.getOutgoingQuantity() != null ? entry.getOutgoingQuantity() : 0.0;
                double arr = entry.getArrivalQuantity() != null ? entry.getArrivalQuantity() : 0.0;
                if (out > 0.0) {
                    trashItem.setEntryType("OUT");
                    trashItem.setQuantity(out);
                    trashItem.setOriginalDate(entry.getIssueDate());
                    trashItem.setOriginalTime(entry.getIssueTime() != null ? entry.getIssueTime().toString() : null);
                } else {
                    trashItem.setEntryType("IN");
                    trashItem.setQuantity(arr);
                    trashItem.setOriginalDate(entry.getArrivalDate());
                    trashItem.setOriginalTime(entry.getArrivalTime() != null ? entry.getArrivalTime().toString() : null);
                }
                trashItem.setDeletedAt(java.time.LocalDateTime.now());
                trashItem.setDeletedBy(deletedBy);
                trashItem.setLocation(entry.getLocation());

                // Serialized JSON snapshot
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
                java.util.Map<String, Object> payload = new java.util.HashMap<>();
                payload.put("id", entry.getId().toString());
                payload.put("billNumber", entry.getBillNumber());
                payload.put("arrivalQuantity", entry.getArrivalQuantity());
                payload.put("outgoingQuantity", entry.getOutgoingQuantity());
                payload.put("arrivalDate", entry.getArrivalDate() != null ? entry.getArrivalDate().toString() : null);
                payload.put("arrivalTime", entry.getArrivalTime() != null ? entry.getArrivalTime().toString() : null);
                payload.put("issueDate", entry.getIssueDate() != null ? entry.getIssueDate().toString() : null);
                payload.put("issueTime", entry.getIssueTime() != null ? entry.getIssueTime().toString() : null);
                payload.put("issuedBy", entry.getIssuedBy());
                payload.put("materialId", materialId != null ? materialId.toString() : null);
                payload.put("locationId", locationId != null ? locationId.toString() : null);
                trashItem.setDataPayload(mapper.writeValueAsString(payload));

                trashItemRepository.save(trashItem);
            } catch (Exception e) {
                logger.error("Error creating TrashItem for entry {}: {}", entry.getId(), e.getMessage(), e);
            }
            
            if (materialId != null) {
                recalculateMaterialStockBalance(materialId, locationId);
            }

            if (locationId != null) {
                try {
                    messagingTemplate.convertAndSend("/topic/location/" + locationId, "STOCK_UPDATED");
                } catch(Exception ignored) {}
            }
            
            try {
                User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                emailService.sendAuditEmail(currentUser, "MOVED_TO_TRASH", dataDetails, locationName);
            } catch(Exception e) {}
        });
    }

    @Transactional
    public double recalculateMaterialStockBalance(UUID materialId, UUID locationId) {
        if (materialId == null) return 0.0;

        List<StockEntry> rawEntries = stockEntryRepository.findByMaterialId(materialId);
        if (rawEntries == null || rawEntries.isEmpty()) return 0.0;

        // Filter ONLY non-deleted entries for balance calculation
        List<StockEntry> entries = rawEntries.stream()
                .filter(e -> !e.isDeleted())
                .collect(java.util.stream.Collectors.toList());

        System.out.println("RECALC_DBG: MAT_ID=" + materialId + " | ACTIVE_ENTRIES_COUNT=" + entries.size());
        if (entries.isEmpty()) {
            return 0.0;
        }

        double totalArrival = 0.0;
        java.util.Map<String, Double> arrivalBatches = new java.util.HashMap<>();

        for (StockEntry e : entries) {
            double out = e.getOutgoingQuantity() != null ? e.getOutgoingQuantity() : 0.0;
            double arr = e.getArrivalQuantity() != null ? e.getArrivalQuantity() : 0.0;

            if (out > 0.0 && arr > 0.0) {
                e.setArrivalQuantity(0.0);
                arr = 0.0;
                stockEntryRepository.save(e);
            }

            if (arr > 0.0) {
                String key = e.getId() != null ? e.getId().toString() : (e.getArrivalDate() + "_" + e.getArrivalTime() + "_" + arr);
                arrivalBatches.put(key, arr);
            }
        }

        for (Double arrVal : arrivalBatches.values()) {
            totalArrival += arrVal;
        }

        if (totalArrival == 0.0) {
            double maxArr = 0.0;
            for (StockEntry e : entries) {
                double arr = e.getArrivalQuantity() != null ? e.getArrivalQuantity() : 0.0;
                if (arr > maxArr) maxArr = arr;
            }
            totalArrival = maxArr;
        }

        double totalOutgoing = 0.0;
        for (StockEntry e : entries) {
            double out = e.getOutgoingQuantity() != null ? e.getOutgoingQuantity() : 0.0;
            totalOutgoing += out;
        }

        double universalBalance = Math.max(0.0, totalArrival - totalOutgoing);
        String universalAvailable = universalBalance > 0 ? "YES" : "NO";
        System.out.println("   RECALC_RESULT: totalArr=" + totalArrival + " | totalOut=" + totalOutgoing + " | universalBalance=" + universalBalance);

        boolean changed = false;
        for (StockEntry e : entries) {
            Double curQty = e.getTotalAvailableQty();
            String curAvail = e.getAvailableInStore();
            if (curQty == null || Math.abs(curQty - universalBalance) > 0.0001 || !universalAvailable.equals(curAvail)) {
                e.setTotalAvailableQty(universalBalance);
                e.setAvailableInStore(universalAvailable);
                stockEntryRepository.save(e);
                changed = true;
            }
        }
        if (changed && entityManager != null) {
            try {
                entityManager.flush();
            } catch (Exception ignored) {}
        }
        return universalBalance;
    }

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void onApplicationReady() {
        try {
            transactionTemplate.execute(status -> {
                recalculateAllStockEntries();
                return null;
            });
        } catch (Exception e) {
            System.err.println("Startup stock recalculation error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String normalizeMaterialKey(String code, String name) {
        String c = code != null ? code.trim().toLowerCase() : "";
        String n = name != null ? name.trim().toLowerCase() : "";
        c = c.replace("bound", "bond").replace("glinder", "grinder").replace("while", "wheel").replaceAll("[^a-z0-9]", "").replaceAll("\\d{6,8}$", "");
        n = n.replace("bound", "bond").replace("glinder", "grinder").replace("while", "wheel").replaceAll("[^a-z0-9]", "").replaceAll("\\d{6,8}$", "");
        if (!c.isEmpty()) return c;
        return n;
    }

    @Transactional
    public void deduplicateMaterials() {
        try {
            List<Material> materials = materialRepository.findAll();
            java.util.Map<String, Material> masterMap = new java.util.HashMap<>();
            for (Material m : materials) {
                if (m == null || m.getId() == null) continue;
                String normKey = normalizeMaterialKey(m.getMaterialCode(), m.getName());
                if (normKey.isEmpty()) continue;

                if (!masterMap.containsKey(normKey)) {
                    masterMap.put(normKey, m);
                } else {
                    Material master = masterMap.get(normKey);
                    logger.info("Merging duplicate material {} ({}) into master {} ({})", m.getId(), m.getName(), master.getId(), master.getName());
                    try {
                        List<StockEntry> dupEntries = stockEntryRepository.findByMaterialId(m.getId());
                        if (dupEntries != null && !dupEntries.isEmpty()) {
                            for (StockEntry se : dupEntries) {
                                se.setMaterial(master);
                                stockEntryRepository.save(se);
                            }
                        }
                        m.setActive(false);
                        materialRepository.save(m);
                    } catch (Exception e) {
                        logger.warn("JPA merge/deactivate duplicate material {} failed: {}", m.getId(), e.getMessage());
                    }
                }
            }
            if (entityManager != null) {
                try {
                    entityManager.flush();
                    entityManager.clear();
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            logger.error("Error deduplicating materials: {}", e.getMessage(), e);
        }
    }

    public void recalculateAllStockEntries() {
        logger.info("--- STARTUP STOCK RECALCULATION STARTING ---");
        try {
            deduplicateMaterials();
        } catch (Exception e) {
            logger.warn("deduplicateMaterials warning: {}", e.getMessage());
        }
        List<Material> materials = materialRepository.findAll();
        logger.info("Total materials found in DB: {}", materials.size());
        for (Material m : materials) {
            if (m != null && m.getId() != null) {
                try {
                    UUID locId = m.getLocation() != null ? m.getLocation().getId() : null;
                    recalculateMaterialStockBalance(m.getId(), locId);
                } catch (Exception e) {
                    logger.error("Error recalculating material {}: {}", m.getId(), e.getMessage(), e);
                }
            }
        }
        logger.info("--- STARTUP STOCK RECALCULATION COMPLETE ---");
    }
}
