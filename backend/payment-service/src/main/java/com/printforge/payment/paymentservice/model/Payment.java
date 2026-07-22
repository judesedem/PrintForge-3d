package com.printforge.payment.paymentservice.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    // The estimate that drove this payment amount
    private Long estimateId;

    // The marketplace listing being ordered (nullable — only set for marketplace orders)
    private Long listingId;

    // The print job created after payment clears (null until webhook confirms)
    private Long printJobId;

    // Carried through from order submission to handleWebhook()'s PrintJob
    // creation — the Estimate has no home for these (see
    // PrintJobFacadeController.submitMarketplaceOrder()'s comment), and
    // color/notes are only known at order-submission time, not recoverable
    // from the Estimate. notes capped to match PrintJob.notes's own
    // @Column(length=500) (#71) — color is left uncapped, same as
    // PrintJob.color.
    private String color;

    @Column(length = 500)
    private String notes;

    @Column(precision = 10, scale = 2)
    private BigDecimal amount;

    // Always GHS for now — extend later if multi-currency is needed
    private String currency = "GHS";

    // PENDING → COMPLETED or FAILED
    private String status;

    // Paystack's own reference string — used to verify on webhook
    @Column(unique = true)
    private String paystackReference;

    // Hosted checkout URL returned by Paystack /transaction/initialize
    private String checkoutUrl;

    private LocalDateTime initiatedAt;
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        this.initiatedAt = LocalDateTime.now();
        if (this.status == null) this.status = "PENDING";
        if (this.currency == null) this.currency = "GHS";
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getEstimateId() { return estimateId; }
    public void setEstimateId(Long estimateId) { this.estimateId = estimateId; }

    public Long getListingId() { return listingId; }
    public void setListingId(Long listingId) { this.listingId = listingId; }

    public Long getPrintJobId() { return printJobId; }
    public void setPrintJobId(Long printJobId) { this.printJobId = printJobId; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPaystackReference() { return paystackReference; }
    public void setPaystackReference(String paystackReference) { this.paystackReference = paystackReference; }

    public String getCheckoutUrl() { return checkoutUrl; }
    public void setCheckoutUrl(String checkoutUrl) { this.checkoutUrl = checkoutUrl; }

    public LocalDateTime getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(LocalDateTime initiatedAt) { this.initiatedAt = initiatedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
