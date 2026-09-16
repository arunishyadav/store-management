package com.finsen.store.controller;

import com.finsen.store.entity.Material;
import com.finsen.store.entity.Location;
import com.finsen.store.repository.MaterialRepository;
import com.finsen.store.repository.LocationRepository;
import com.finsen.store.repository.StockEntryRepository;
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

    @Autowired
    private MaterialRepository materialRepository;
    
    @Autowired
    private LocationRepository locationRepository;
    
    @Autowired
    private StockEntryRepository stockEntryRepository;
    
    @Autowired
    private EmailService emailService;

    @GetMapping
    public List<Material> getAllMaterials(@RequestParam(required = false) UUID locationId) {
        if (locationId != null) {
            return materialRepository.findByLocationId(locationId);
        }
        return materialRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Material> getMaterialById(@PathVariable UUID id) {
        return materialRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public List<Material> searchMaterials(@RequestParam String query) {
        return materialRepository.findByNameContainingIgnoreCaseOrMaterialCodeContainingIgnoreCase(query, query);
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
            loc = locationRepository.findAll().stream().findFirst().orElse(null);
        }
        material.setLocation(loc);
        material.setActive(true);
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
                    
                    stockEntryRepository.deleteByMaterialId(material.getId());
                    materialRepository.delete(material);
                    
                    try {
                        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                        emailService.sendAuditEmail(currentUser, "DELETED", dataDetails, locName);
                    } catch(Exception e) {}
                    
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
