package com.finsen.store.repository;

import com.finsen.store.entity.MISReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MISReportRepository extends JpaRepository<MISReport, Long> {
    List<MISReport> findByReportDate(LocalDate reportDate);
    boolean existsByReportDate(LocalDate reportDate);
}
