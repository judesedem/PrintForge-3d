package com.printforge.payment.paymentservice.dto;

public class InitiatePaymentRequest {

    // Optional — provided for standard prints
    private Long estimateId;

    // Optional — provided when ordering from the marketplace
    private Long listingId;
    
    // Optional — provided when paying for a design request
    private Long requestId;

    // Optional — provided when upgrading to Premium Designer status
    private Boolean isPremiumUpgrade;

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
    
    public Long getRequestId() { return requestId; }
    public void setRequestId(Long requestId) { this.requestId = requestId; }

    public Boolean getIsPremiumUpgrade() { return isPremiumUpgrade; }
    public void setIsPremiumUpgrade(Boolean isPremiumUpgrade) { this.isPremiumUpgrade = isPremiumUpgrade; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
