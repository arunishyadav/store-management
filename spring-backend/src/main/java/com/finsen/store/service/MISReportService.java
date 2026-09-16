package com.finsen.store.service;

import com.finsen.store.entity.MISReport;
import com.finsen.store.entity.Material;
import com.finsen.store.repository.MISReportRepository;
import com.finsen.store.repository.MaterialRepository;
import com.finsen.store.repository.StockEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class MISReportService {

    private final MISReportRepository misReportRepository;
    private final MaterialRepository materialRepository;
    private final StockEntryRepository stockEntryRepository;

    @Autowired
    public MISReportService(MISReportRepository misReportRepository, MaterialRepository materialRepository, StockEntryRepository stockEntryRepository) {
        this.misReportRepository = misReportRepository;
        this.materialRepository = materialRepository;
        this.stockEntryRepository = stockEntryRepository;
    }

    @Scheduled(cron = "0 59 23 * * ?") // Runs at 11:59 PM every day
    @Transactional
    public void generateDailyMISReport() {
        LocalDate today = LocalDate.now();
        
        // Prevent duplicate generation
        if (misReportRepository.existsByReportDate(today)) {
            return;
        }

        List<Object[]> aggregatedData = stockEntryRepository.getAggregatedStockByCategoryAndName();
        List<Material> allMaterials = materialRepository.findAll();

        for (Material material : allMaterials) {
            Double totalInward = 0.0;
            Double totalOutgoing = 0.0;

            for (Object[] row : aggregatedData) {
                if (row[4] != null && row[4].equals(material.getId())) {
                    totalInward = row[2] != null ? (Double) row[2] : 0.0;
                    totalOutgoing = row[3] != null ? (Double) row[3] : 0.0;
                    break;
                }
            }

            Double closingStock = totalInward - totalOutgoing;

            MISReport report = new MISReport(
                    null,
                    today,
                    material,
                    0.0, // Simplification: Opening stock can be calculated dynamically if needed
                    totalInward,
                    totalOutgoing,
                    closingStock,
                    LocalDateTime.now()
            );
            misReportRepository.save(report);
        }
    }

    public List<MISReport> getReportsByDate(LocalDate date) {
        return misReportRepository.findByReportDate(date);
    }
}
