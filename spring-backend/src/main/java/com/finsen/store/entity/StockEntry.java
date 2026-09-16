package com.finsen.store.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "stock_entries")
public class StockEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "bill_number")
    private String billNumber;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "material_id", nullable = false)
    private Material material;
    @Column(name = "arrival_quantity")
    private Double arrivalQuantity;
    @Column(name = "arrival_date")
    private LocalDate arrivalDate;

    @Column(name = "arrival_time")
    private LocalTime arrivalTime;

    @Column(name = "available_in_store")
    private String availableInStore = "YES";

    @Column(name = "outgoing_quantity")
    private Double outgoingQuantity;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "issued_by")
    private String issuedBy;

    @Column(name = "store_incharge_name")
    private String storeInchargeName;

    @Column(name = "total_avl_qty")
    private Double totalAvailableQty;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @Column(name = "product_length")
    private String productLength;

    @Column(name = "inner_diameter")
    private String innerDiameter;

    @Column(name = "kg")
    private String kg;

    @Column(name = "brought_by")
    private String broughtBy;

    public StockEntry() {}
    public StockEntry(UUID id, String billNumber, Material material, Double arrivalQuantity, LocalDate arrivalDate, LocalTime arrivalTime, String availableInStore, Double outgoingQuantity, LocalDate issueDate, String issuedBy, String storeInchargeName, Double totalAvailableQty, String productLength, String innerDiameter, String kg, String broughtBy, Location location) {
        this.id = id; this.billNumber = billNumber; this.material = material; this.arrivalQuantity = arrivalQuantity; this.arrivalDate = arrivalDate; this.arrivalTime = arrivalTime; this.availableInStore = availableInStore; this.outgoingQuantity = outgoingQuantity; this.issueDate = issueDate; this.issuedBy = issuedBy; this.storeInchargeName = storeInchargeName; this.totalAvailableQty = totalAvailableQty; this.productLength = productLength; this.innerDiameter = innerDiameter; this.kg = kg; this.broughtBy = broughtBy; this.location = location;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getBillNumber() { return billNumber; }
    public void setBillNumber(String billNumber) { this.billNumber = billNumber; }
    public Material getMaterial() { return material; }
    public void setMaterial(Material material) { this.material = material; }
    public Double getArrivalQuantity() { return arrivalQuantity; }
    public void setArrivalQuantity(Double arrivalQuantity) { this.arrivalQuantity = arrivalQuantity; }
    public LocalDate getArrivalDate() { return arrivalDate; }
    public void setArrivalDate(LocalDate arrivalDate) { this.arrivalDate = arrivalDate; }
    public LocalTime getArrivalTime() { return arrivalTime; }
    public void setArrivalTime(LocalTime arrivalTime) { this.arrivalTime = arrivalTime; }
    public String getAvailableInStore() { return availableInStore; }
    public void setAvailableInStore(String availableInStore) { this.availableInStore = availableInStore; }
    public Double getOutgoingQuantity() { return outgoingQuantity; }
    public void setOutgoingQuantity(Double outgoingQuantity) { this.outgoingQuantity = outgoingQuantity; }
    public LocalDate getIssueDate() { return issueDate; }
    public void setIssueDate(LocalDate issueDate) { this.issueDate = issueDate; }
    public String getIssuedBy() { return issuedBy; }
    public void setIssuedBy(String issuedBy) { this.issuedBy = issuedBy; }
    public String getStoreInchargeName() { return storeInchargeName; }
    public void setStoreInchargeName(String storeInchargeName) { this.storeInchargeName = storeInchargeName; }
    public Double getTotalAvailableQty() { return totalAvailableQty; }
    public void setTotalAvailableQty(Double totalAvailableQty) { this.totalAvailableQty = totalAvailableQty; }
    public String getProductLength() { return productLength; }
    public void setProductLength(String productLength) { this.productLength = productLength; }
    public String getInnerDiameter() { return innerDiameter; }
    public void setInnerDiameter(String innerDiameter) { this.innerDiameter = innerDiameter; }
    public String getKg() { return kg; }
    public void setKg(String kg) { this.kg = kg; }
    public Location getLocation() { return location; }
    public void setLocation(Location location) { this.location = location; }
    public String getBroughtBy() { return broughtBy; }
    public void setBroughtBy(String broughtBy) { this.broughtBy = broughtBy; }

    @PrePersist
    @PreUpdate
    public void calculateAvailableQuantity() {
        double arr = arrivalQuantity != null ? arrivalQuantity : 0.0;
        double out = outgoingQuantity != null ? outgoingQuantity : 0.0;
        this.totalAvailableQty = arr - out;
        this.availableInStore = this.totalAvailableQty > 0 ? "YES" : "NO";
    }
}
