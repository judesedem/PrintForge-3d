package com.printforge.notification.moderationservice.repository;

import com.printforge.notification.moderationservice.model.Report;
import com.printforge.notification.moderationservice.model.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, Long> {
    Page<Report> findByStatus(ReportStatus status, Pageable pageable);
}
