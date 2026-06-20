package com.printforge.printforge.queueservice.controller;

import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.service.PrintQueueService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/queue")
public class PrintQueueController {

    private final PrintQueueService printQueueService;

    public PrintQueueController(PrintQueueService printQueueService) {
        this.printQueueService = printQueueService;
    }

    // 1. ADD A JOB (Triggered when customer clicks "Checkout")
    @PostMapping
    public ResponseEntity<PrintJob> createPrintJob(
            @RequestParam Long fileId,
            @RequestParam Long estimateId,
            @RequestParam Long userId) {

        PrintJob newJob = printQueueService.createPrintJob(fileId, estimateId, userId);
        return ResponseEntity.ok(newJob);
    }

    // 2. VIEW THE QUEUE (For the Admin Dashboard)
    // If they pass a status (e.g., ?status=PENDING), it filters. Otherwise, it shows everything.
    @GetMapping
    public ResponseEntity<List<PrintJob>> getQueue(@RequestParam(required = false) String status) {
        if (status != null && !status.isEmpty()) {
            return ResponseEntity.ok(printQueueService.getJobsByStatus(status));
        }
        return ResponseEntity.ok(printQueueService.getAllJobs());
    }

    // 3. UPDATE JOB STATUS (For the Farm Operators)
    // Uses @PatchMapping because we are just modifying specific fields of an existing job
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
}