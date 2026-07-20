package com.printforge.printforge.moderationservice.controller;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.moderationservice.dto.CreateReportRequest;
import com.printforge.printforge.moderationservice.dto.UpdateReportStatusRequest;
import com.printforge.printforge.moderationservice.model.Report;
import com.printforge.printforge.moderationservice.service.ReportService;
import com.printforge.printforge.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

/**
 * Shared moderation-report system — covers both "this design isn't theirs
 * to sell" (#67, targetType=LISTING) and "this content/user is harmful"
 * (#68, targetType=USER) through one Report entity/flow.
 *
 * POST  /api/reports              → any authenticated user files a report
 * GET   /api/admin/reports        → ADMIN only, paginated, optional ?status=
 * PATCH /api/admin/reports/{id}   → ADMIN only, moves status forward
 */
@RestController
public class ReportController {

    private final ReportService reportService;
    private final UserRepository userRepository;

    public ReportController(ReportService reportService, UserRepository userRepository) {
        this.reportService = reportService;
        this.userRepository = userRepository;
    }

    @PostMapping("/api/reports")
    public ResponseEntity<Report> createReport(
            @RequestBody CreateReportRequest request,
            Authentication authentication) {

        User caller = currentUser(authentication);
        Report report = reportService.createReport(caller.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(report);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/api/admin/reports")
    public ResponseEntity<Page<Report>> getReports(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(reportService.getReports(status, pageable));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/api/admin/reports/{id}")
    public ResponseEntity<Report> updateReportStatus(
            @PathVariable Long id,
            @RequestBody UpdateReportStatusRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(reportService.updateStatus(id, request.getStatus(), currentUser(authentication)));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
