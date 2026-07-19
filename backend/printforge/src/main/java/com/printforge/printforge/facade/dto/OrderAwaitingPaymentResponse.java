package com.printforge.printforge.facade.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.printforge.printforge.estimateservice.model.Estimate;

/**
 * Returned by POST /api/print-jobs and POST /api/print-jobs/upload now that
 * neither endpoint creates a PrintJob (see #58 — PaymentService.handleWebhook
 * is the only place a PrintJob is created, gated on payment actually
 * clearing). Carries the Estimate the frontend needs to call
 * POST /api/payments/initiate next, plus a status flag so the mobile app
 * knows to go straight to the Paystack flow instead of expecting a job.
 */
public class OrderAwaitingPaymentResponse {

    @JsonProperty("status")
    private final String status = "awaiting_payment";

    private Estimate estimate;

    @JsonProperty("listing_id")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Long listingId;

    public OrderAwaitingPaymentResponse(Estimate estimate, Long listingId) {
        this.estimate = estimate;
        this.listingId = listingId;
    }

    public String getStatus() { return status; }

    public Estimate getEstimate() { return estimate; }
    public void setEstimate(Estimate estimate) { this.estimate = estimate; }

    public Long getListingId() { return listingId; }
    public void setListingId(Long listingId) { this.listingId = listingId; }
}
