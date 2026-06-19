package com.printforge.printforge.queueservice.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "print_jobs")
public class PrintJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- Cross-Service Links ---
    private Long fileId;
    private Long estimateId;
    private Long userId;

    // --- Production Status ---
    private String status;    // "PENDING", "SLICING", "PRINTING", "COMPLETED", "FAILED"

    // NEW: Farm Management
    private String assignedPrinter; // e.g., "Prusa-MK3-04"
    private String operatorNotes;   // e.g., "Failed at 80% - nozzle clog"

    // NEW: Fulfillment
    private String shippingTrackingNumber;

    // --- The Timeline ---
    private LocalDateTime submittedAt;
    private LocalDateTime startedAt;
    private LocalDateTime estimatedCompletionAt; // NEW: For the frontend ETA
    private LocalDateTime completedAt;

    // --- Lifecycle Callbacks ---
    @PrePersist
    protected void onCreate() {
        this.submittedAt = LocalDateTime.now();
        this.status = "PENDING";
    }

    // --- Getters and Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFileId() { return fileId; }
    public void setFileId(Long fileId) { this.fileId = fileId; }

    public Long getEstimateId() { return estimateId; }
    public void setEstimateId(Long estimateId) { this.estimateId = estimateId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAssignedPrinter() { return assignedPrinter; }
    public void setAssignedPrinter(String assignedPrinter) { this.assignedPrinter = assignedPrinter; }

    public String getOperatorNotes() { return operatorNotes; }
    public void setOperatorNotes(String operatorNotes) { this.operatorNotes = operatorNotes; }

    public String getShippingTrackingNumber() { return shippingTrackingNumber; }
    public void setShippingTrackingNumber(String shippingTrackingNumber) { this.shippingTrackingNumber = shippingTrackingNumber; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getEstimatedCompletionAt() { return estimatedCompletionAt; }
    public void setEstimatedCompletionAt(LocalDateTime estimatedCompletionAt) { this.estimatedCompletionAt = estimatedCompletionAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}