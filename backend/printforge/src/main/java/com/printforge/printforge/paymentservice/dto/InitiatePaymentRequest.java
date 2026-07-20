package com.printforge.printforge.paymentservice.dto;

import jakarta.validation.constraints.NotNull;

public class InitiatePaymentRequest {

    @NotNull(message = "estimateId is required")
    private Long estimateId;

    // Optional — only provided when ordering from the marketplace
    private Long listingId;

    // Optional — the color/notes the customer chose at order-submission
    // time (see PrintJobFacadeController.submitMarketplaceOrder()/
    // submitJob()). Carried here since Estimate has no home for them;
    // PaymentService.initiatePayment() stores them on the Payment row so
    // handleWebhook() can copy them onto the PrintJob it creates.
    private String color;
    private String notes;

    public Long getEstimateId() { return estimateId; }
    public void setEstimateId(Long estimateId) { this.estimateId = estimateId; }

    public Long getListingId() { return listingId; }
    public void setListingId(Long listingId) { this.listingId = listingId; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
