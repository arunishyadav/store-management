package com.finsen.store.controller;

import com.finsen.store.entity.MISReport;
import com.finsen.store.service.MISReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@CrossOrigin(origins = "*", maxAge = 3600)
public class MISReportController {

    private final MISReportService misReportService;

    @Autowired
    public MISReportController(MISReportService misReportService) {
        this.misReportService = misReportService;
    }

    @GetMapping("/mis")
    public ResponseEntity<List<MISReport>> getMISReportByDate(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }
        return ResponseEntity.ok(misReportService.getReportsByDate(date));
    }
    
    @PostMapping("/mis/generate")
    public ResponseEntity<String> forceGenerateMISReport() {
        misReportService.generateDailyMISReport();
        return ResponseEntity.ok("MIS Report generation triggered for today.");
    }
}
