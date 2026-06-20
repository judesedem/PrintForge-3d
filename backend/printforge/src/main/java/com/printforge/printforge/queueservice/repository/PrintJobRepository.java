package com.printforge.printforge.queueservice.repository;

import com.printforge.printforge.queueservice.model.PrintJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrintJobRepository extends JpaRepository<PrintJob, Long> {

    // Custom query: Admins will definitely need to filter jobs by status
    // (e.g., "Show me all PENDING jobs")
    List<PrintJob> findByStatus(String status);

    // Custom query: Customers will want to see their own order history
    List<PrintJob> findByUserId(Long userId);
}