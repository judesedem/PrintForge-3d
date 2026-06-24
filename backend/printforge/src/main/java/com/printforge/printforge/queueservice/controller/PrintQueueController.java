package com.printforge.printforge.queueservice.controller;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.service.PrintQueueService;
import com.printforge.printforge.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

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

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
