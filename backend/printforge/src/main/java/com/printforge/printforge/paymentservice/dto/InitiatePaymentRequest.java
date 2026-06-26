package com.printforge.printforge.paymentservice.dto;

import jakarta.validation.constraints.NotNull;

public class InitiatePaymentRequest {

    @NotNull(message = "estimateId is required")
    private Long estimateId;

    // Optional — only provided when ordering from the marketplace
    private Long listingId;

    public Long getEstimateId() { return estimateId; }
    public void setEstimateId(Long estimateId) { this.estimateId = estimateId; }

    public Long getListingId() { return listingId; }
    public void setListingId(Long listingId) { this.listingId = listingId; }
}
