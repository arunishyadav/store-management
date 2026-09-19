package com.finsen.store.controller;

import com.finsen.store.entity.TrashItem;
import com.finsen.store.service.TrashService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/trash")
@CrossOrigin(origins = "*", maxAge = 3600)
public class TrashController {

    private final TrashService trashService;

    @Autowired
    public TrashController(TrashService trashService) {
        this.trashService = trashService;
    }

    @GetMapping
    public ResponseEntity<List<TrashItem>> getTrashItems(@RequestParam(required = false) UUID locationId) {
        return ResponseEntity.ok(trashService.getTrashItems(locationId));
    }

    @PostMapping("/restore/{id:[0-9a-fA-F-]{36}}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_INCHARGE')")
    public ResponseEntity<TrashItem> restoreItem(@PathVariable UUID id) {
        return ResponseEntity.ok(trashService.restoreItem(id));
    }

    @PostMapping("/restore-batch")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_INCHARGE')")
    public ResponseEntity<List<UUID>> restoreBatch(@RequestBody List<UUID> ids) {
        return ResponseEntity.ok(trashService.restoreBatch(ids));
    }

    @DeleteMapping("/{id:[0-9a-fA-F-]{36}}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_INCHARGE')")
    public ResponseEntity<Void> permanentDeleteItem(@PathVariable UUID id) {
        trashService.permanentDeleteItem(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/delete-batch")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_INCHARGE')")
    public ResponseEntity<Void> permanentDeleteBatch(@RequestBody List<UUID> ids) {
        trashService.permanentDeleteBatch(ids);
        return ResponseEntity.noContent().build();
    }
}
