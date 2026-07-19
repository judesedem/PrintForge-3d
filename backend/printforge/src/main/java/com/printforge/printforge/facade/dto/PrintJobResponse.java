package com.printforge.printforge.facade.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.printforge.printforge.labservice.dto.LabLocationSummary;

/**
 * Maps PrintJob + enrichment data to the exact shape the frontend's
 * PrintJob TypeScript interface expects — snake_case fields, status values
 * in lowercase (submitted/approved/queued/printing/completed/rejected),
 * and denormalized file_name / user_name so the frontend never needs to
 * make extra calls to look those up.
 */
public class PrintJobResponse {

    @JsonProperty("job_id")
    private String jobId;

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("user_name")
    private String userName;

    @JsonProperty("file_name")
    private String fileName;

    private String material;
    private String color;
    private Integer quantity;
    private String status;

    @JsonProperty("submitted_at")
    private String submittedAt;

    @JsonProperty("estimated_cost")
    private Double estimatedCost;

    @JsonProperty("estimated_time")
    private Integer estimatedTime;   // minutes

    @JsonProperty("printer_name")
    private String printerName;

    @JsonProperty("queue_position")
    private Integer queuePosition;

    private String notes;

    @JsonProperty("pickup_location")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private LabLocationSummary pickupLocation;

    // ── Getters and setters ──────────────────────────────────────────────

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getMaterial() { return material; }
    public void setMaterial(String material) { this.material = material; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(String submittedAt) { this.submittedAt = submittedAt; }

    public Double getEstimatedCost() { return estimatedCost; }
    public void setEstimatedCost(Double estimatedCost) { this.estimatedCost = estimatedCost; }

    public Integer getEstimatedTime() { return estimatedTime; }
    public void setEstimatedTime(Integer estimatedTime) { this.estimatedTime = estimatedTime; }

    public String getPrinterName() { return printerName; }
    public void setPrinterName(String printerName) { this.printerName = printerName; }

    public Integer getQueuePosition() { return queuePosition; }
    public void setQueuePosition(Integer queuePosition) { this.queuePosition = queuePosition; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LabLocationSummary getPickupLocation() { return pickupLocation; }
    public void setPickupLocation(LabLocationSummary pickupLocation) { this.pickupLocation = pickupLocation; }
}
