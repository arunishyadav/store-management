package com.finsen.store.repository;

import com.finsen.store.entity.Material;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MaterialRepository extends JpaRepository<Material, UUID> {
    List<Material> findByNameContainingIgnoreCaseOrMaterialCodeContainingIgnoreCase(String name, String code);
    List<Material> findByLocationId(UUID locationId);
}
