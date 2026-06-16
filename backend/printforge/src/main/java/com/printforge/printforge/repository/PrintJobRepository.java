package com.printforge.printforge.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.printforge.printforge.entity.JobStatus;
import com.printforge.printforge.entity.PrintJob;

@Repository
public interface PrintJobRepository extends JpaRepository<PrintJob, Long> {

    List<PrintJob> findByUserId(Long userId);

    List<PrintJob> findByStatus(JobStatus status);
}