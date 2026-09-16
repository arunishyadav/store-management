package com.finsen.store.runner;

import com.finsen.store.service.StockEntryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class StockRecalculationRunner implements CommandLineRunner {

    private final StockEntryService stockEntryService;

    @Autowired
    public StockRecalculationRunner(StockEntryService stockEntryService) {
        this.stockEntryService = stockEntryService;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== RUNNING COMMAND LINE STOCK RECALCULATION ===");
        try {
            stockEntryService.recalculateAllStockEntries();
            System.out.println("=== COMMAND LINE STOCK RECALCULATION COMPLETE ===");
        } catch (Exception e) {
            System.err.println("=== ERROR IN COMMAND LINE STOCK RECALCULATION: " + e.getMessage() + " ===");
            e.printStackTrace();
        }
    }
}
