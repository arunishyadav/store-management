package com.finsen.store.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "support_contacts")
public class SupportContact {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String designation;

    @Column(nullable = false)
    private String name;

    private String contactNumber;
    private String email;

    public SupportContact() {}

    public SupportContact(UUID id, String designation, String name, String contactNumber, String email) {
        this.id = id;
        this.designation = designation;
        this.name = name;
        this.contactNumber = contactNumber;
        this.email = email;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
