package com.finsen.store.service;

import com.finsen.store.dto.ChartItemDTO;
import com.finsen.store.repository.StockEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final StockEntryRepository stockEntryRepository;

    @Autowired
    public DashboardService(StockEntryRepository stockEntryRepository) {
        this.stockEntryRepository = stockEntryRepository;
    }

    public Map<String, List<ChartItemDTO>> getCategoryCharts(java.util.UUID locationId) {
        List<Object[]> results;
        if (locationId != null) {
            results = stockEntryRepository.getAggregatedStockByCategoryAndNameByLocation(locationId);
        } else {
            results = stockEntryRepository.getAggregatedStockByCategoryAndName();
        }
        Map<String, List<ChartItemDTO>> categoryMap = new HashMap<>();

        for (Object[] row : results) {
            String category = row[0] != null ? row[0].toString() : "Uncategorized";
            String name = row[1] != null ? row[1].toString() : "Unknown";
            Double totalInward = row[2] != null ? (Double) row[2] : 0.0;
            Double totalOutgoing = row[3] != null ? (Double) row[3] : 0.0;
            Double currentStock = totalInward - totalOutgoing;

            ChartItemDTO item = new ChartItemDTO(name, currentStock, totalOutgoing);
            
            categoryMap.computeIfAbsent(category, k -> new ArrayList<>()).add(item);
        }

        return categoryMap;
    }
}
