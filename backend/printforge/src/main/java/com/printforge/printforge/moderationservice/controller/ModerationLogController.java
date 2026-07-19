package com.printforge.printforge.moderationservice.controller;

import com.printforge.printforge.moderationservice.exception.InvalidModerationLogQueryException;
import com.printforge.printforge.moderationservice.model.ModerationLogEntry;
import com.printforge.printforge.moderationservice.model.ModerationTargetType;
import com.printforge.printforge.moderationservice.service.ModerationLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read side of the moderation audit log (#66 slice). ADMIN only.
 *
 * GET /api/admin/moderation-log/{targetType}/{targetId} → full history for
 * one listing/user/report, oldest first, so an admin can see exactly what
 * happened to it and in what order.
 */
@RestController
@PreAuthorize("hasRole('ADMIN')")
public class ModerationLogController {

    private final ModerationLogService moderationLogService;

    public ModerationLogController(ModerationLogService moderationLogService) {
        this.moderationLogService = moderationLogService;
    }

    @GetMapping("/api/admin/moderation-log/{targetType}/{targetId}")
    public ResponseEntity<List<ModerationLogEntry>> getLogForTarget(
            @PathVariable String targetType,
            @PathVariable Long targetId) {

        // String, not the enum directly, on the path variable — an invalid
        // value should fail as a clean 400 (InvalidModerationLogQueryException)
        // rather than Spring's MethodArgumentTypeMismatchException falling
        // through to GlobalExceptionHandler's generic 500 fallback. Same
        // reasoning as CreateReportRequest.targetType in the Report system.
        ModerationTargetType parsed;
        try {
            parsed = ModerationTargetType.valueOf(targetType.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidModerationLogQueryException("targetType must be one of LISTING, USER, REPORT");
        }

        return ResponseEntity.ok(moderationLogService.getLogForTarget(parsed, targetId));
    }
}
