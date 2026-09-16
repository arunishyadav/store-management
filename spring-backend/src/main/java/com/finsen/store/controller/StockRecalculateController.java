package com.finsen.store.controller;

import com.finsen.store.service.StockEntryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/recalculate", "/api/v1/recalculate-all"})
@CrossOrigin(origins = "*", maxAge = 3600)
public class StockRecalculateController {

    private final StockEntryService stockEntryService;

    @Autowired
    public StockRecalculateController(StockEntryService stockEntryService) {
        this.stockEntryService = stockEntryService;
    }

    @GetMapping
    public ResponseEntity<String> recalculateGet() {
        stockEntryService.recalculateAllStockEntries();
        return ResponseEntity.ok("Stock recalculation completed successfully");
    }

    @PostMapping
    public ResponseEntity<String> recalculatePost() {
        stockEntryService.recalculateAllStockEntries();
        return ResponseEntity.ok("Stock recalculation completed successfully");
    }
}
