package com.printforge.printforge.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.printforge.printforge.dto.UpdateJobRequest;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.repository.UserRepository;
import com.printforge.printforge.service.PrintJobService;

import lombok.RequiredArgsConstructor;

// Raw job endpoint — bypasses facade business logic (no validation, no
// notifications). Regular traffic goes through PrintJobFacadeController;
// this one exists for ops/debugging but is still scoped so a STUDENT/
// DESIGNER can only see/edit their own jobs, same as the facade.
@RestController
@RequestMapping("/api/job-service/print-jobs")
@RequiredArgsConstructor
public class PrintJobController {

    private final PrintJobService printJobService;
    private final UserRepository userRepository;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<PrintJob> createPrintJob(@RequestBody PrintJob printJob) {
        return ResponseEntity.ok(printJobService.createPrintJob(printJob));
    }

    @GetMapping
    public ResponseEntity<List<PrintJob>> getAllPrintJobs(Authentication authentication) {
        if (isStaff(authentication)) {
            return ResponseEntity.ok(printJobService.getAllPrintJobs());
        }

        User caller = currentUser(authentication);
        return ResponseEntity.ok(printJobService.getJobsForUser(caller.getUserId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrintJob> getPrintJobById(@PathVariable Long id, Authentication authentication) {
        PrintJob job = printJobService.getPrintJobById(id);

        if (!isStaff(authentication)) {
            User caller = currentUser(authentication);
            if (!job.getUserId().equals(caller.getUserId())) {
                throw new AccessDeniedException("You can only view your own print jobs");
            }
        }

        return ResponseEntity.ok(job);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PrintJob> updatePrintJob(
            @PathVariable Long id,
            @RequestBody UpdateJobRequest request,
            Authentication authentication
    ) {
        PrintJob job = printJobService.getPrintJobById(id);

        if (!isStaff(authentication)) {
            User caller = currentUser(authentication);
            if (!job.getUserId().equals(caller.getUserId())) {
                throw new AccessDeniedException("You can only update your own print jobs");
            }
        }

        return ResponseEntity.ok(printJobService.updateJobFields(id, request));
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(r -> r.equals("ROLE_LAB_STAFF") || r.equals("ROLE_ADMIN"));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
