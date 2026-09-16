package com.finsen.store.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Material {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String materialCode;
    private String name;
    private String category;
    private String unit;
    private Double minQuantity;
    
    @ManyToOne
    @JoinColumn(name = "location_id")
    private Location location;
    private boolean active;

    public Material() {}
    public Material(UUID id, String materialCode, String name, String category, String unit, Double minQuantity, Location location, boolean active) {
        this.id = id; this.materialCode = materialCode; this.name = name; this.category = category; this.unit = unit; this.minQuantity = minQuantity; this.location = location; this.active = active;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getMaterialCode() { return materialCode; }
    public void setMaterialCode(String materialCode) { this.materialCode = materialCode; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public Double getMinQuantity() { return minQuantity; }
    public void setMinQuantity(Double minQuantity) { this.minQuantity = minQuantity; }
    public Location getLocation() { return location; }
    public void setLocation(Location location) { this.location = location; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
