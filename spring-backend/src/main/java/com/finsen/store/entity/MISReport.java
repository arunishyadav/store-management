package com.finsen.store.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "mis_reports")
public class MISReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "report_date")
    private LocalDate reportDate;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "material_id", nullable = false)
    private Material material;
    
    @Column(name = "opening_stock")
    private Double openingStock;
    
    @Column(name = "total_inward")
    private Double totalInward;
    
    @Column(name = "total_issued")
    private Double totalIssued;
    
    @Column(name = "closing_stock")
    private Double closingStock;
    
    @Column(name = "generated_at")
    private LocalDateTime generatedAt;

    public MISReport() {}

    public MISReport(Long id, LocalDate reportDate, Material material, Double openingStock, Double totalInward, Double totalIssued, Double closingStock, LocalDateTime generatedAt) {
        this.id = id;
        this.reportDate = reportDate;
        this.material = material;
        this.openingStock = openingStock;
        this.totalInward = totalInward;
        this.totalIssued = totalIssued;
        this.closingStock = closingStock;
        this.generatedAt = generatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getReportDate() { return reportDate; }
    public void setReportDate(LocalDate reportDate) { this.reportDate = reportDate; }
    public Material getMaterial() { return material; }
    public void setMaterial(Material material) { this.material = material; }
    public Double getOpeningStock() { return openingStock; }
    public void setOpeningStock(Double openingStock) { this.openingStock = openingStock; }
    public Double getTotalInward() { return totalInward; }
    public void setTotalInward(Double totalInward) { this.totalInward = totalInward; }
    public Double getTotalIssued() { return totalIssued; }
    public void setTotalIssued(Double totalIssued) { this.totalIssued = totalIssued; }
    public Double getClosingStock() { return closingStock; }
    public void setClosingStock(Double closingStock) { this.closingStock = closingStock; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }
}
