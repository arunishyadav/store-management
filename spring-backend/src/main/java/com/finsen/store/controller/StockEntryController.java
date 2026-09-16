package com.finsen.store.controller;

import com.finsen.store.entity.StockEntry;
import com.finsen.store.service.StockEntryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/v1/stock-entries")
@CrossOrigin(origins = "*", maxAge = 3600)
public class StockEntryController {

    private final StockEntryService stockEntryService;

    @Autowired
    public StockEntryController(StockEntryService stockEntryService) {
        this.stockEntryService = stockEntryService;
    }

    @GetMapping
    public ResponseEntity<List<StockEntry>> getEntries(@RequestParam(required = false) UUID locationId) {
        return ResponseEntity.ok(stockEntryService.getEntriesByLocation(locationId));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_INCHARGE')")
    public ResponseEntity<StockEntry> createEntry(@RequestBody StockEntry entry) {
        return ResponseEntity.ok(stockEntryService.createOrUpdateEntry(entry));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_INCHARGE')")
    public ResponseEntity<StockEntry> updateEntry(@PathVariable UUID id, @RequestBody StockEntry entry) {
        entry.setId(id);
        return ResponseEntity.ok(stockEntryService.createOrUpdateEntry(entry));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('STORE_INCHARGE')")
    public ResponseEntity<Void> deleteEntry(@PathVariable UUID id) {
        stockEntryService.deleteEntry(id);
        return ResponseEntity.noContent().build();
    }
}
