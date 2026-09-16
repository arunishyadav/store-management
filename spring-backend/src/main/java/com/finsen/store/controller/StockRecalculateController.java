package com.finsen.store.controller;

import com.finsen.store.service.StockEntryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/stock-recalculate")
@CrossOrigin(origins = "*", maxAge = 3600)
public class StockRecalculateController {

    private final StockEntryService stockEntryService;

    @Autowired
    public StockRecalculateController(StockEntryService stockEntryService) {
        this.stockEntryService = stockEntryService;
    }

    @RequestMapping(method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<String> recalculate() {
        stockEntryService.recalculateAllStockEntries();
        return ResponseEntity.ok("Recalculation complete");
    }
}
