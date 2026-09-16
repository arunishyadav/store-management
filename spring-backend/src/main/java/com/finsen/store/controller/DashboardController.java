package com.finsen.store.controller;

import com.finsen.store.dto.ChartItemDTO;
import com.finsen.store.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DashboardController {

    private final DashboardService dashboardService;

    @Autowired
    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/charts")
    public ResponseEntity<Map<String, List<ChartItemDTO>>> getCategoryCharts(
            @org.springframework.web.bind.annotation.RequestParam(required = false) java.util.UUID locationId) {
        return ResponseEntity.ok(dashboardService.getCategoryCharts(locationId));
    }
}
