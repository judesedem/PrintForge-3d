package com.printforge.order.printerservice.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "printers")
public class Printer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The human-readable identifier, e.g. "Prusa-MK3-04" — this is the same
    // kind of value PrintJob.assignedPrinter already stores as free text.
    // Tying the two together (validated in PrintQueueService) means staff
    // can no longer assign a job to a printer that doesn't actually exist.
    @Column(name = "printer_name", nullable = false, unique = true)
    private String printerName;

    // AVAILABLE, BUSY, OFFLINE, MAINTENANCE
    @Column(nullable = false)
    private String status;

    private String labLocation;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null || this.status.isBlank()) {
            this.status = "AVAILABLE";
        }
    }

    // --- Getters and Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPrinterName() { return printerName; }
    public void setPrinterName(String printerName) { this.printerName = printerName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLabLocation() { return labLocation; }
    public void setLabLocation(String labLocation) { this.labLocation = labLocation; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
