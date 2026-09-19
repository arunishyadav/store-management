package com.finsen.store.repository;

import com.finsen.store.entity.TrashItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TrashItemRepository extends JpaRepository<TrashItem, UUID> {

    @Query("SELECT t FROM TrashItem t LEFT JOIN FETCH t.location ORDER BY t.deletedAt DESC")
    List<TrashItem> findAllOrderByDeletedAtDesc();

    @Query("SELECT t FROM TrashItem t LEFT JOIN FETCH t.location WHERE t.location.id = :locationId ORDER BY t.deletedAt DESC")
    List<TrashItem> findByLocationIdOrderByDeletedAtDesc(@Param("locationId") UUID locationId);

    Optional<TrashItem> findByOriginalRecordId(String originalRecordId);
}
