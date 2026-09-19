package com.finsen.store.repository;

import com.finsen.store.entity.StockEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockEntryRepository extends JpaRepository<StockEntry, UUID> {
    @org.springframework.data.jpa.repository.Query("SELECT s FROM StockEntry s JOIN FETCH s.material LEFT JOIN FETCH s.location ORDER BY s.arrivalDate DESC, s.arrivalTime DESC")
    List<StockEntry> findAllWithDetails();

    @org.springframework.data.jpa.repository.Query("SELECT s FROM StockEntry s JOIN FETCH s.material LEFT JOIN FETCH s.location WHERE s.location.id = :locationId ORDER BY s.arrivalDate DESC, s.arrivalTime DESC")
    List<StockEntry> findByLocationIdWithDetails(@org.springframework.data.repository.query.Param("locationId") UUID locationId);

    List<StockEntry> findByLocationIdOrderByArrivalDateDesc(UUID locationId);
    List<StockEntry> findByMaterialId(UUID materialId);
    List<StockEntry> findByMaterialIdAndLocationId(UUID materialId, UUID locationId);
    
    @org.springframework.transaction.annotation.Transactional
    void deleteByMaterialId(UUID materialId);

    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "UPDATE stock_entries SET total_avl_qty = :balance, available_in_store = :avail WHERE material_id = :materialId", nativeQuery = true)
    void updateMaterialStockBalance(@org.springframework.data.repository.query.Param("materialId") UUID materialId, @org.springframework.data.repository.query.Param("balance") Double balance, @org.springframework.data.repository.query.Param("avail") String avail);

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
