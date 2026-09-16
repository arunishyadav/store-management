package com.finsen.store.repository;

import com.finsen.store.entity.StockEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockEntryRepository extends JpaRepository<StockEntry, UUID> {
    List<StockEntry> findByLocationIdOrderByArrivalDateDesc(UUID locationId);
    
    @org.springframework.transaction.annotation.Transactional
    void deleteByMaterialId(UUID materialId);

    @org.springframework.data.jpa.repository.Query(value = "SELECT m.category, m.name, SUM(sub.arrival), SUM(sub.outgoing), m.id " +
                   "FROM materials m JOIN (" +
                   "  SELECT material_id, bill_number, " +
                   "  MAX(arrival_quantity) as arrival, SUM(outgoing_quantity) as outgoing " +
                   "  FROM stock_entries " +
                   "  GROUP BY material_id, COALESCE(NULLIF(TRIM(bill_number), ''), CAST(id AS VARCHAR))" +
                   ") sub ON m.id = sub.material_id " +
                   "GROUP BY m.category, m.name, m.id", nativeQuery = true)
    List<Object[]> getAggregatedStockByCategoryAndName();

    @org.springframework.data.jpa.repository.Query(value = "SELECT m.category, m.name, SUM(sub.arrival), SUM(sub.outgoing), m.id " +
                   "FROM materials m JOIN (" +
                   "  SELECT material_id, bill_number, " +
                   "  MAX(arrival_quantity) as arrival, SUM(outgoing_quantity) as outgoing " +
                   "  FROM stock_entries " +
                   "  WHERE location_id = :locationId " +
                   "  GROUP BY material_id, COALESCE(NULLIF(TRIM(bill_number), ''), CAST(id AS VARCHAR))" +
                   ") sub ON m.id = sub.material_id " +
                   "GROUP BY m.category, m.name, m.id", nativeQuery = true)
    List<Object[]> getAggregatedStockByCategoryAndNameByLocation(@org.springframework.data.repository.query.Param("locationId") UUID locationId);
}
