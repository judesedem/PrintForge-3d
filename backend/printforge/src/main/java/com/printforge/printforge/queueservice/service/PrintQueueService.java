package com.printforge.printforge.queueservice.service;

import com.printforge.printforge.estimateservice.exception.EstimateNotFoundException;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.fileservice.exception.ModelFileNotFoundException;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.queueservice.exception.InvalidJobStatusException;
import com.printforge.printforge.queueservice.exception.PrintJobNotFoundException;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
public class PrintQueueService {

    // Matches the comment on PrintJob.status. Centralized here so
    // updateJobStatus can actually enforce it instead of accepting anything.
    private static final Set<String> VALID_STATUSES =
            Set.of("PENDING", "SLICING", "PRINTING", "COMPLETED", "FAILED");

    private final PrintJobRepository printJobRepository;
    private final ModelFileRepository modelFileRepository;
    private final EstimateRepository estimateRepository;

    public PrintQueueService(PrintJobRepository printJobRepository,
                              ModelFileRepository modelFileRepository,
                              EstimateRepository estimateRepository) {
        this.printJobRepository = printJobRepository;
        this.modelFileRepository = modelFileRepository;
        this.estimateRepository = estimateRepository;
    }

    // 1. ADD TO QUEUE (Triggered after a customer checks out)
    public PrintJob createPrintJob(Long fileId, Long estimateId, Long userId) {
        // Previously fileId/estimateId were trusted blindly — a job could be
        // created referencing ids that don't exist anywhere, with no error.
        if (!modelFileRepository.existsById(fileId)) {
            throw new ModelFileNotFoundException(fileId);
        }
        if (!estimateRepository.existsById(estimateId)) {
            throw new EstimateNotFoundException(estimateId);
        }

        PrintJob newJob = new PrintJob();
        newJob.setFileId(fileId);
        newJob.setEstimateId(estimateId);
        newJob.setUserId(userId);
        // Note: status is automatically set to "PENDING" and submittedAt is set by @PrePersist in the Model
        return printJobRepository.save(newJob);
    }

    public PrintJob getJobById(Long jobId) {
        return printJobRepository.findById(jobId)
                .orElseThrow(() -> new PrintJobNotFoundException(jobId));
    }

    // 2. VIEW THE QUEUE (For the Admin/Staff Dashboard)
    public List<PrintJob> getAllJobs() {
        return printJobRepository.findAll();
    }

    public List<PrintJob> getJobsByStatus(String status) {
        return printJobRepository.findByStatus(status.toUpperCase());
    }

    /**
     * Student-scoped view: only this user's own jobs, optionally filtered
     * by status. The controller calls this instead of getAllJobs()/
     * getJobsByStatus() for non-staff callers.
     */
    public List<PrintJob> getJobsForUser(Long userId, String status) {
        List<PrintJob> jobs = printJobRepository.findByUserId(userId);
        if (status == null || status.isBlank()) {
            return jobs;
        }
        String normalized = status.toUpperCase();
        return jobs.stream().filter(j -> normalized.equals(j.getStatus())).toList();
    }

    // 3. UPDATE JOB STATUS (The most important operational method)
    public PrintJob updateJobStatus(Long jobId, String newStatus, String printerId, String operatorNotes, String trackingNumber) {

        // Find the job, or throw a proper 404 (was a generic RuntimeException -> 500 before)
        PrintJob job = printJobRepository.findById(jobId)
                .orElseThrow(() -> new PrintJobNotFoundException(jobId));

        // Previously any string was accepted here, uppercased, and saved —
        // a typo created a permanently broken/unrecognized status with no error.
        String normalizedStatus = newStatus == null ? "" : newStatus.trim().toUpperCase();
        if (!VALID_STATUSES.contains(normalizedStatus)) {
            throw new InvalidJobStatusException(
                    "Invalid status '" + newStatus + "'. Must be one of: " + VALID_STATUSES);
        }
        job.setStatus(normalizedStatus);

        if (printerId != null) job.setAssignedPrinter(printerId);
        if (operatorNotes != null) job.setOperatorNotes(operatorNotes);
        if (trackingNumber != null) job.setShippingTrackingNumber(trackingNumber);

        // Smart Timestamp Logic based on the status change
        if ("PRINTING".equals(normalizedStatus) && job.getStartedAt() == null) {
            job.setStartedAt(LocalDateTime.now());
            // In a real scenario, you'd pull the durationMinutes from the Estimate Service here to set the ETA
            // job.setEstimatedCompletionAt(LocalDateTime.now().plusMinutes(estimateDuration));
        } else if ("COMPLETED".equals(normalizedStatus) || "FAILED".equals(normalizedStatus)) {
            if (job.getCompletedAt() == null) {
                job.setCompletedAt(LocalDateTime.now());
            }
        }

        return printJobRepository.save(job);
    }
}
