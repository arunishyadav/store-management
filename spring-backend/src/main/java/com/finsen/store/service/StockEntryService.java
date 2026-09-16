package com.finsen.store.service;

import com.finsen.store.entity.Location;
import com.finsen.store.entity.Material;
import com.finsen.store.entity.StockEntry;
import com.finsen.store.repository.LocationRepository;
import com.finsen.store.repository.MaterialRepository;
import com.finsen.store.repository.StockEntryRepository;
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

    private final StockEntryRepository stockEntryRepository;
    private final MaterialRepository materialRepository;
    private final LocationRepository locationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final EmailService emailService;

    @Autowired
    public StockEntryService(StockEntryRepository stockEntryRepository, MaterialRepository materialRepository, LocationRepository locationRepository, SimpMessagingTemplate messagingTemplate, EmailService emailService) {
        this.stockEntryRepository = stockEntryRepository;
        this.materialRepository = materialRepository;
        this.locationRepository = locationRepository;
        this.messagingTemplate = messagingTemplate;
        this.emailService = emailService;
    }

    public List<StockEntry> getAllEntries() {
        return stockEntryRepository.findAll();
    }

    public List<StockEntry> getEntriesByLocation(UUID locationId) {
        if (locationId == null) {
            return stockEntryRepository.findAll();
        }
        return stockEntryRepository.findByLocationIdOrderByArrivalDateDesc(locationId);
    }

    @Transactional
    public StockEntry createOrUpdateEntry(StockEntry entry) {
        // Validate material association
        Material material = materialRepository.findById(entry.getMaterial().getId())
                .orElseThrow(() -> new RuntimeException("Material not found"));
        
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
        
        entry.setMaterial(material);
        entry.setLocation(location);
        
        boolean isUpdate = entry.getId() != null;
        
        StockEntry savedEntry = stockEntryRepository.save(entry);
        
        // Universal Store Balance Recalculation across all rows for this material in DB
        recalculateMaterialStockBalance(material.getId(), location.getId());
        
        // Re-fetch updated row with recalculated universal balance
        savedEntry = stockEntryRepository.findById(savedEntry.getId()).orElse(savedEntry);
        
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
            
            stockEntryRepository.delete(entry);
            
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
                emailService.sendAuditEmail(currentUser, "DELETED", dataDetails, locationName);
            } catch(Exception e) {}
        });
    }

    @Transactional
    public void recalculateMaterialStockBalance(UUID materialId, UUID locationId) {
        if (materialId == null) return;

        List<StockEntry> entries;
        if (locationId != null) {
            entries = stockEntryRepository.findByMaterialIdAndLocationId(materialId, locationId);
        } else {
            entries = stockEntryRepository.findByMaterialId(materialId);
        }

        if (entries == null || entries.isEmpty()) return;

        double totalArrival = 0.0;
        java.util.Map<String, Double> arrivalBatches = new java.util.HashMap<>();

        for (StockEntry e : entries) {
            double out = e.getOutgoingQuantity() != null ? e.getOutgoingQuantity() : 0.0;
            double arr = e.getArrivalQuantity() != null ? e.getArrivalQuantity() : 0.0;

            if (out == 0.0 && arr > 0.0) {
                String dateStr = e.getArrivalDate() != null ? e.getArrivalDate().toString() : "nodate";
                String timeStr = e.getArrivalTime() != null ? e.getArrivalTime().toString() : "notime";
                String batchKey = dateStr + "_" + timeStr + "_" + arr;
                if (!arrivalBatches.containsKey(batchKey) || arr > arrivalBatches.get(batchKey)) {
                    arrivalBatches.put(batchKey, arr);
                }
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

        for (StockEntry e : entries) {
            e.setTotalAvailableQty(universalBalance);
            e.setAvailableInStore(universalAvailable);
        }
        stockEntryRepository.saveAll(entries);
    }
}
