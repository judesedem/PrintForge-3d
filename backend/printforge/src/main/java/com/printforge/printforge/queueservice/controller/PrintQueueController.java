package com.printforge.printforge.queueservice.controller;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.service.PrintQueueService;
import com.printforge.printforge.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/queue")
public class PrintQueueController {

    private final PrintQueueService printQueueService;
    private final UserRepository userRepository;

    public PrintQueueController(PrintQueueService printQueueService, UserRepository userRepository) {
        this.printQueueService = printQueueService;
        this.userRepository = userRepository;
    }

    // 1. ADD A JOB (Triggered when customer clicks "Checkout")
    // Previously userId came straight from the client (@RequestParam), so
    // any logged-in user could create a job "as" anyone else just by
    // passing a different id. Now it's always the caller's own id, taken
    // from the JWT.
    @PostMapping
    public ResponseEntity<PrintJob> createPrintJob(
            @RequestParam Long fileId,
            @RequestParam Long estimateId,
            Authentication authentication) {

        Long callerId = currentUser(authentication).getUserId();
        PrintJob newJob = printQueueService.createPrintJob(fileId, estimateId, callerId);
        return ResponseEntity.ok(newJob);
    }

    // 2. VIEW THE QUEUE
    // Staff/admin see everything (this doubles as the ops dashboard).
    // Students only ever see their own jobs — previously any authenticated
    // user could list every job in the system, including other students'.
    @GetMapping
    public ResponseEntity<List<PrintJob>> getQueue(
            @RequestParam(required = false) String status,
            Authentication authentication) {

        if (isStaff(authentication)) {
            if (status != null && !status.isEmpty()) {
                return ResponseEntity.ok(printQueueService.getJobsByStatus(status));
            }
            return ResponseEntity.ok(printQueueService.getAllJobs());
        }

        Long callerId = currentUser(authentication).getUserId();
        return ResponseEntity.ok(printQueueService.getJobsForUser(callerId, status));
    }

    // NEW: view a single job by id. Didn't exist before at all — there was
    // no way to fetch one specific job, only list endpoints.
    @GetMapping("/{jobId}")
    public ResponseEntity<PrintJob> getJobById(@PathVariable Long jobId, Authentication authentication) {
        PrintJob job = printQueueService.getJobById(jobId);

        if (!isStaff(authentication) && !job.getUserId().equals(currentUser(authentication).getUserId())) {
            throw new AccessDeniedException("You can only view your own print jobs");
        }
        return ResponseEntity.ok(job);
    }

    // 3. UPDATE JOB STATUS (For the Farm Operators)
    // Previously open to any authenticated user, including students, who
    // could mark their own (or anyone's) job COMPLETED, assign a printer,
    // etc. Now restricted to LAB_STAFF/ADMIN.
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

    // --- Authorization helpers (same pattern as NotificationController) ---

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_LAB_STAFF") || role.equals("ROLE_ADMIN"));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
