package com.printforge.order.queueservice.controller;

import com.printforge.order.entity.User;
import com.printforge.order.queueservice.model.PrintJob;
import com.printforge.order.queueservice.service.PrintQueueService;
import com.printforge.order.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Handles low-level queue operations that the facade doesn't own:
 *   - POST  /api/print-jobs/raw  (legacy: create job from existing fileId/estimateId)
 *   - PATCH /api/print-jobs/:id/status (staff status update)
 *
 * GET /api/print-jobs and GET /api/print-jobs/:id are handled by
 * PrintJobFacadeController which returns enriched responses the frontend needs.
 */
@RestController
@RequestMapping("/api/print-jobs")
public class PrintQueueController {

    private final PrintQueueService printQueueService;
    private final UserRepository userRepository;

    public PrintQueueController(PrintQueueService printQueueService, UserRepository userRepository) {
        this.printQueueService = printQueueService;
        this.userRepository = userRepository;
    }

    // ── PATCH /api/print-jobs/:id/status (Staff only) ────────────────────────
    // Direct status update without going through the facade's approve/reject flow.
    // Used for setting PRINTING, COMPLETED, FAILED etc. with operator notes.
    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @PatchMapping("/{jobId}/status")
    public ResponseEntity<PrintJob> updateJobStatus(
            @PathVariable Long jobId,
            @RequestParam String status,
            @RequestParam(required = false) String printerId,
            @RequestParam(required = false) String operatorNotes,
            @RequestParam(required = false) String trackingNumber) {

        PrintJob updatedJob = printQueueService.updateJobStatus(
                jobId, status, printerId, operatorNotes, trackingNumber);

        return ResponseEntity.ok(updatedJob);
    }

    // ── PATCH /api/print-jobs/:id/transition (Staff only) ────────────────────
    // Strict APPROVED→PRINTING→READY→COLLECTED lifecycle with a JSON body
    // ({"status": "PRINTING"}) and per-transition notifications. This is
    // intentionally a separate path from /status above rather than a
    // change to it: /status already exists with a query-param contract and
    // no transition validation, and two @PatchMapping handlers can't share
    // one path, so the new stricter behavior the spec calls for lives here
    // instead of altering the existing endpoint.
    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @PatchMapping("/{jobId}/transition")
    public ResponseEntity<PrintJob> transitionJobStatus(
            @PathVariable Long jobId,
            @RequestBody Map<String, Object> body) {

        String status = body.get("status") != null ? body.get("status").toString() : null;
        PrintJob updatedJob = printQueueService.transitionJobStatus(jobId, status);
        return ResponseEntity.ok(updatedJob);
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
