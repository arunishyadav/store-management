package com.finsen.store.controller;

import com.finsen.store.entity.Material;
import com.finsen.store.entity.Location;
import com.finsen.store.entity.TrashItem;
import com.finsen.store.repository.MaterialRepository;
import com.finsen.store.repository.LocationRepository;
import com.finsen.store.repository.StockEntryRepository;
import com.finsen.store.repository.TrashItemRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.core.context.SecurityContextHolder;
import com.finsen.store.entity.User;
import com.finsen.store.service.EmailService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/materials")
public class MaterialController {

    private static final Logger logger = LoggerFactory.getLogger(MaterialController.class);

    @Autowired
    private MaterialRepository materialRepository;
    
    @Autowired
    private LocationRepository locationRepository;
    
    @Autowired
    private StockEntryRepository stockEntryRepository;

    @Autowired
    private TrashItemRepository trashItemRepository;
    
    @Autowired
    private EmailService emailService;

    @GetMapping
    public List<Material> getAllMaterials(@RequestParam(required = false) UUID locationId) {
        if (locationId != null) {
            return materialRepository.findByLocationIdAndDeletedFalse(locationId);
        }
        return materialRepository.findByDeletedFalse();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Material> getMaterialById(@PathVariable UUID id) {
        return materialRepository.findById(id)
                .filter(m -> !m.isDeleted())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public List<Material> searchMaterials(@RequestParam String query) {
        return materialRepository.findByNameContainingIgnoreCaseOrMaterialCodeContainingIgnoreCaseAndDeletedFalse(query, query);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STORE_INCHARGE')")
    public ResponseEntity<Material> createMaterial(@RequestBody Material material) {
        Location loc = null;
        if (material.getLocation() != null && material.getLocation().getId() != null) {
            try {
                loc = locationRepository.findById(material.getLocation().getId()).orElse(null);
            } catch (Exception ignored) {}
        }
        if (loc == null) {
            try {
                User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                if (currentUser != null && currentUser.getLocation() != null) {
                    loc = currentUser.getLocation();
                }
            } catch (Exception ignored) {}
        }
        if (loc == null) {
            loc = locationRepository.findAll().stream().findFirst().orElse(null);
        }
        material.setLocation(loc);
        material.setActive(true);
        material.setDeleted(false);
        Material saved = materialRepository.save(material);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STORE_INCHARGE')")
    public ResponseEntity<Material> updateMaterial(@PathVariable UUID id, @RequestBody Material materialDetails) {
        return materialRepository.findById(id)
                .map(material -> {
                    material.setMaterialCode(materialDetails.getMaterialCode());
                    material.setName(materialDetails.getName());
                    material.setCategory(materialDetails.getCategory());
                    material.setUnit(materialDetails.getUnit());
                    material.setMinQuantity(materialDetails.getMinQuantity());
                    if (materialDetails.getLocation() != null && materialDetails.getLocation().getId() != null) {
                        try {
                            Location loc = locationRepository.findById(materialDetails.getLocation().getId()).orElse(null);
                            if (loc != null) material.setLocation(loc);
                        } catch (Exception ignored) {}
                    }
                    material.setActive(materialDetails.isActive());
                    Material saved = materialRepository.save(material);
                    
                    try {
                        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                        String dataDetails = "Updated Material Code: " + saved.getMaterialCode() + "\nName: " + saved.getName();
                        String locName = saved.getLocation() != null ? saved.getLocation().getName() : "Unknown";
                        emailService.sendAuditEmail(currentUser, "UPDATED", dataDetails, locName);
                    } catch(Exception e) {}
                    
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> deleteMaterial(@PathVariable UUID id) {
        return materialRepository.findById(id)
                .map(material -> {
                    String dataDetails = "Deleted Material Code: " + material.getMaterialCode() + "\nName: " + material.getName();
                    String locName = material.getLocation() != null ? material.getLocation().getName() : "Unknown";
                    
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

                    // Soft-delete the material (DO NOT cascade-delete stock entries!)
                    material.setDeleted(true);
                    material.setActive(false);
                    material.setDeletedAt(java.time.LocalDateTime.now());
                    material.setDeletedBy(deletedBy);
                    materialRepository.save(material);

                    // Create snapshot in Trash Bin
                    try {
                        TrashItem trashItem = new TrashItem();
                        trashItem.setSourceModule("MATERIAL");
                        trashItem.setOriginalRecordId(material.getId().toString());
                        trashItem.setMaterialCode(material.getMaterialCode());
                        trashItem.setMaterialName(material.getName());
                        trashItem.setUnit(material.getUnit());
                        trashItem.setEntryType("MATERIAL");
                        trashItem.setQuantity(0.0);
                        trashItem.setOriginalDate(java.time.LocalDate.now());
                        trashItem.setDeletedAt(java.time.LocalDateTime.now());
                        trashItem.setDeletedBy(deletedBy);
                        trashItem.setLocation(material.getLocation());

                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
                        java.util.Map<String, Object> payload = new java.util.HashMap<>();
                        payload.put("id", material.getId().toString());
                        payload.put("materialCode", material.getMaterialCode());
                        payload.put("name", material.getName());
                        payload.put("category", material.getCategory());
                        payload.put("unit", material.getUnit());
                        payload.put("minQuantity", material.getMinQuantity());
                        payload.put("locationId", material.getLocation() != null ? material.getLocation().getId().toString() : null);
                        trashItem.setDataPayload(mapper.writeValueAsString(payload));

                        trashItemRepository.save(trashItem);
                    } catch (Exception e) {
                        logger.error("Error creating TrashItem for material {}: {}", material.getId(), e.getMessage(), e);
                    }
                    
                    try {
                        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                        emailService.sendAuditEmail(currentUser, "MOVED_TO_TRASH", dataDetails, locName);
                    } catch(Exception e) {}
                    
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
