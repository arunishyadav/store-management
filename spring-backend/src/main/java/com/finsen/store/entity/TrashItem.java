package com.finsen.store.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "trash_items")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TrashItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "source_module", nullable = false)
    private String sourceModule; // "ENTRY_BOOK" or "MATERIAL"

    @Column(name = "original_record_id", nullable = false)
    private String originalRecordId;

    @Column(name = "material_code")
    private String materialCode;

    @Column(name = "material_name")
    private String materialName;

    @Column(name = "quantity")
    private Double quantity;

    @Column(name = "entry_type")
    private String entryType; // "IN", "OUT", "MATERIAL"

    @Column(name = "unit")
    private String unit;

    @Column(name = "original_date")
    private LocalDate originalDate;

    @Column(name = "original_time")
    private String originalTime;

    @Column(name = "deleted_at", nullable = false)
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private String deletedBy;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "location_id")
    private Location location;

    @Lob
    @Column(name = "data_payload", columnDefinition = "TEXT")
    private String dataPayload;

    public TrashItem() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getSourceModule() { return sourceModule; }
    public void setSourceModule(String sourceModule) { this.sourceModule = sourceModule; }

    public String getOriginalRecordId() { return originalRecordId; }
    public void setOriginalRecordId(String originalRecordId) { this.originalRecordId = originalRecordId; }

    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }

    public String getMaterialName() { return materialName; }
    public void setMaterialName(String materialName) { this.materialName = materialName; }

    public Double getQuantity() { return quantity; }
    public void setQuantity(Double quantity) { this.quantity = quantity; }

    public String getEntryType() { return entryType; }
    public void setEntryType(String entryType) { this.entryType = entryType; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public LocalDate getOriginalDate() { return originalDate; }
    public void setOriginalDate(LocalDate originalDate) { this.originalDate = originalDate; }

    public String getOriginalTime() { return originalTime; }
    public void setOriginalTime(String originalTime) { this.originalTime = originalTime; }

    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }

    public String getDeletedBy() { return deletedBy; }
    public void setDeletedBy(String deletedBy) { this.deletedBy = deletedBy; }

    public Location getLocation() { return location; }
    public void setLocation(Location location) { this.location = location; }

    public String getDataPayload() { return dataPayload; }
    public void setDataPayload(String dataPayload) { this.dataPayload = dataPayload; }
}
