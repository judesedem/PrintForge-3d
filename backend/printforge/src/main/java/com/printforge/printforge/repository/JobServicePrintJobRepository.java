package com.printforge.printforge.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.printforge.printforge.queueservice.model.PrintJob;

@Repository
public interface JobServicePrintJobRepository extends JpaRepository<PrintJob, Long> {

    List<PrintJob> findByUserId(Long userId);

    List<PrintJob> findByStatus(String status);
}