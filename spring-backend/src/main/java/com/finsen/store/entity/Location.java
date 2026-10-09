package com.finsen.store.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Location {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String name;
    private String code;
    private String address;

    @Column(name = "state_name")
    private String stateName;

    @Column(name = "site_name")
    private String siteName;

    private boolean active;

    public Location() {}
    public Location(UUID id, String name, String code, String address, boolean active) {
        this.id = id; this.name = name; this.code = code; this.address = address; this.active = active;
        this.stateName = name;
        this.siteName = address != null && !address.isBlank() ? address : (name + " Site");
    }

    public Location(UUID id, String name, String code, String address, String stateName, String siteName, boolean active) {
        this.id = id; this.name = name; this.code = code; this.address = address;
        this.stateName = stateName; this.siteName = siteName; this.active = active;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getStateName() { return stateName != null && !stateName.isBlank() ? stateName : name; }
    public void setStateName(String stateName) { this.stateName = stateName; }
    public String getSiteName() { return siteName != null && !siteName.isBlank() ? siteName : (address != null && !address.isBlank() ? address : (name != null ? name + " Site" : "Main Site")); }
    public void setSiteName(String siteName) { this.siteName = siteName; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
