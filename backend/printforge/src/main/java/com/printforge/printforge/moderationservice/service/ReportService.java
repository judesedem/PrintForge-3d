package com.printforge.printforge.moderationservice.service;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.moderationservice.dto.CreateReportRequest;
import com.printforge.printforge.moderationservice.exception.InvalidReportInputException;
import com.printforge.printforge.moderationservice.exception.ReportNotFoundException;
import com.printforge.printforge.moderationservice.model.ModerationActionType;
import com.printforge.printforge.moderationservice.model.ModerationTargetType;
import com.printforge.printforge.moderationservice.model.Report;
import com.printforge.printforge.moderationservice.model.ReportStatus;
import com.printforge.printforge.moderationservice.model.ReportTargetType;
import com.printforge.printforge.moderationservice.repository.ReportRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class ReportService {

    private static final Set<String> VALID_TARGET_TYPES = Set.of("LISTING", "USER");
    // PENDING is deliberately excluded — an admin resolving a report moves
    // it forward, never resets it back to the default it starts in.
    private static final Set<String> VALID_UPDATE_STATUSES = Set.of("REVIEWED", "DISMISSED", "ACTIONED");
    private static final int MAX_REASON_LENGTH = 1000;

    private final ReportRepository reportRepository;
    private final ModerationLogService moderationLogService;

    public ReportService(ReportRepository reportRepository, ModerationLogService moderationLogService) {
        this.reportRepository = reportRepository;
        this.moderationLogService = moderationLogService;
    }

    public Report createReport(Long reporterId, CreateReportRequest request) {
        String normalizedTargetType = request.getTargetType() == null
                ? null : request.getTargetType().trim().toUpperCase();
        if (normalizedTargetType == null || !VALID_TARGET_TYPES.contains(normalizedTargetType)) {
            throw new InvalidReportInputException("targetType must be LISTING or USER");
        }
        if (request.getTargetId() == null) {
            throw new InvalidReportInputException("targetId is required");
        }
        String reason = request.getReason();
        if (reason == null || reason.isBlank()) {
            throw new InvalidReportInputException("reason must not be blank");
        }
        if (reason.length() > MAX_REASON_LENGTH) {
            throw new InvalidReportInputException("reason must be " + MAX_REASON_LENGTH + " characters or fewer");
        }

        Report report = new Report();
        report.setReporterId(reporterId);
        report.setTargetType(ReportTargetType.valueOf(normalizedTargetType));
        report.setTargetId(request.getTargetId());
        report.setReason(reason);
        return reportRepository.save(report);
    }

    public Page<Report> getReports(String status, Pageable pageable) {
        if (status == null || status.isBlank()) {
            return reportRepository.findAll(pageable);
        }
        ReportStatus parsed = parseStatus(status, "PENDING, REVIEWED, DISMISSED, ACTIONED");
        return reportRepository.findByStatus(parsed, pageable);
    }

    public Report updateStatus(Long id, String status, User actor) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ReportNotFoundException(id));

        String normalized = status == null ? null : status.trim().toUpperCase();
        if (normalized == null || !VALID_UPDATE_STATUSES.contains(normalized)) {
            throw new InvalidReportInputException("status must be one of REVIEWED, DISMISSED, ACTIONED");
        }

        report.setStatus(ReportStatus.valueOf(normalized));
        Report saved = reportRepository.save(report);
        moderationLogService.log(actor, ModerationActionType.ADMIN_REPORT_STATUS_CHANGE,
                ModerationTargetType.REPORT, id, normalized);
        return saved;
    }

    private ReportStatus parseStatus(String status, String validValuesMessage) {
        try {
            return ReportStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidReportInputException("status must be one of " + validValuesMessage);
        }
    }
}
