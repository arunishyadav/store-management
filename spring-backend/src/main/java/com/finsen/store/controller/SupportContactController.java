package com.finsen.store.controller;

import com.finsen.store.entity.SupportContact;
import com.finsen.store.repository.SupportContactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/support-contacts")
public class SupportContactController {

    @Autowired
    private SupportContactRepository supportContactRepository;

    @GetMapping
    public List<SupportContact> getAllContacts() {
        return supportContactRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public SupportContact createContact(@RequestBody SupportContact contact) {
        return supportContactRepository.save(contact);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<SupportContact> updateContact(@PathVariable UUID id, @RequestBody SupportContact contactDetails) {
        return supportContactRepository.findById(id)
                .map(contact -> {
                    contact.setDesignation(contactDetails.getDesignation());
                    contact.setName(contactDetails.getName());
                    contact.setContactNumber(contactDetails.getContactNumber());
                    contact.setEmail(contactDetails.getEmail());
                    return ResponseEntity.ok(supportContactRepository.save(contact));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> deleteContact(@PathVariable UUID id) {
        return supportContactRepository.findById(id)
                .map(contact -> {
                    supportContactRepository.delete(contact);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
