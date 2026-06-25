package com.printforge.printforge.queueservice.repository;

import com.printforge.printforge.queueservice.model.PrintJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrintJobRepository extends JpaRepository<PrintJob, Long> {

    List<PrintJob> findByStatus(String status);

    List<PrintJob> findByUserId(Long userId);

    /**
     * Returns [status, count] pairs directly from the DB.
     * Used by AdminService.getDashboardSummary() instead of findAll()
     * so we never load every job into memory just to count them.
     */
    @Query("SELECT j.status, COUNT(j) FROM PrintJob j GROUP BY j.status")
    List<Object[]> countGroupedByStatus();

    /**
     * Total job count — single DB COUNT(*) instead of findAll().size().
     */
    @Query("SELECT COUNT(j) FROM PrintJob j")
    long countAllJobs();
}