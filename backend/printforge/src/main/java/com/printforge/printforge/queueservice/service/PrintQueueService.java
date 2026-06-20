package com.printforge.printforge.queueservice.service;

import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PrintQueueService {

    private final PrintJobRepository printJobRepository;

    public PrintQueueService(PrintJobRepository printJobRepository) {
        this.printJobRepository = printJobRepository;
    }

    // 1. ADD TO QUEUE (Triggered after a customer checks out)
    public PrintJob createPrintJob(Long fileId, Long estimateId, Long userId) {
        PrintJob newJob = new PrintJob();
        newJob.setFileId(fileId);
        newJob.setEstimateId(estimateId);
        newJob.setUserId(userId);
        // Note: status is automatically set to "PENDING" and submittedAt is set by @PrePersist in the Model
        return printJobRepository.save(newJob);
    }

    // 2. VIEW THE QUEUE (For the Admin Dashboard)
    public List<PrintJob> getAllJobs() {
        return printJobRepository.findAll();
    }

    public List<PrintJob> getJobsByStatus(String status) {
        return printJobRepository.findByStatus(status.toUpperCase());
    }

    // 3. UPDATE JOB STATUS (The most important operational method)
    public PrintJob updateJobStatus(Long jobId, String newStatus, String printerId, String operatorNotes, String trackingNumber) {

        // Find the job, or throw an error if it doesn't exist
        PrintJob job = printJobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Print Job not found with ID: " + jobId));

        // Update basic tracking info
        job.setStatus(newStatus.toUpperCase());

        if (printerId != null) job.setAssignedPrinter(printerId);
        if (operatorNotes != null) job.setOperatorNotes(operatorNotes);
        if (trackingNumber != null) job.setShippingTrackingNumber(trackingNumber);

        // Smart Timestamp Logic based on the status change
        if ("PRINTING".equalsIgnoreCase(newStatus) && job.getStartedAt() == null) {
            job.setStartedAt(LocalDateTime.now());
            // In a real scenario, you'd pull the durationMinutes from the Estimate Service here to set the ETA
            // job.setEstimatedCompletionAt(LocalDateTime.now().plusMinutes(estimateDuration));
        }
        else if ("COMPLETED".equalsIgnoreCase(newStatus) || "FAILED".equalsIgnoreCase(newStatus)) {
            if (job.getCompletedAt() == null) {
                job.setCompletedAt(LocalDateTime.now());
            }
        }

        return printJobRepository.save(job);
    }
}