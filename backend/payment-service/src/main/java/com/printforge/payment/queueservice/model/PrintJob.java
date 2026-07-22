package com.printforge.payment.queueservice.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "print_jobs")
public class PrintJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Cross-service links
    private Long fileId;
    private Long estimateId;
    private Long userId;

    // Job metadata — stored at submit time so responses are self-contained
    // without requiring joins back to File/Estimate services
    private String material;
    private String color;
    private Integer quantity;
    private String infill;
    private String quality;

    // #71 — length cap made explicit (widens Hibernate's implicit
    // VARCHAR(255) default). JPA-level @Column only, not a Jakarta
    // @Size on the entity: this field is only ever set via UpdateJobRequest
    // (validated below with @Valid) or the ADMIN-only raw create endpoint,
    // so putting @Size here too would add a second enforcement path whose
    // failure mode is an unhandled ConstraintViolationException at
    // save()-time (500, not 400) — see Report.reason for the same
    // DB-cap-only precedent.
    @Column(length = 500)
    private String notes;

    // Production status
    private String status;

    // Farm management
    private String assignedPrinter;
    private String operatorNotes;
    private String shippingTrackingNumber;

    // Set when the job is approved, from the currently active LabLocation.
    private Long labLocationId;

    // Timeline
    private LocalDateTime submittedAt;
    private LocalDateTime startedAt;
    private LocalDateTime estimatedCompletionAt;
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        this.submittedAt = LocalDateTime.now();
        this.status = "SUBMITTED";
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFileId() { return fileId; }
    public void setFileId(Long fileId) { this.fileId = fileId; }

    public Long getEstimateId() { return estimateId; }
    public void setEstimateId(Long estimateId) { this.estimateId = estimateId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getMaterial() { return material; }
    public void setMaterial(String material) { this.material = material; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getInfill() { return infill; }
    public void setInfill(String infill) { this.infill = infill; }

    public String getQuality() { return quality; }
    public void setQuality(String quality) { this.quality = quality; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAssignedPrinter() { return assignedPrinter; }
    public void setAssignedPrinter(String assignedPrinter) { this.assignedPrinter = assignedPrinter; }

    public String getOperatorNotes() { return operatorNotes; }
    public void setOperatorNotes(String operatorNotes) { this.operatorNotes = operatorNotes; }

    public String getShippingTrackingNumber() { return shippingTrackingNumber; }
    public void setShippingTrackingNumber(String shippingTrackingNumber) { this.shippingTrackingNumber = shippingTrackingNumber; }

    public Long getLabLocationId() { return labLocationId; }
    public void setLabLocationId(Long labLocationId) { this.labLocationId = labLocationId; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getEstimatedCompletionAt() { return estimatedCompletionAt; }
    public void setEstimatedCompletionAt(LocalDateTime estimatedCompletionAt) { this.estimatedCompletionAt = estimatedCompletionAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
