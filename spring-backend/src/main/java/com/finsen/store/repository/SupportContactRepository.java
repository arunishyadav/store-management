package com.finsen.store.repository;

import com.finsen.store.entity.SupportContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SupportContactRepository extends JpaRepository<SupportContact, UUID> {
}
