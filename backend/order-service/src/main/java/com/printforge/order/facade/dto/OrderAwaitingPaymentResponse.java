package com.printforge.order.facade.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.printforge.order.estimateservice.model.Estimate;

/**
 * Returned by POST /api/print-jobs and POST /api/print-jobs/upload now that
 * neither endpoint creates a PrintJob (see #58 — PaymentService.handleWebhook
 * is the only place a PrintJob is created, gated on payment actually
 * clearing). Carries the Estimate the frontend needs to call
 * POST /api/payments/initiate next, plus a status flag so the mobile app
 * knows to go straight to the Paystack flow instead of expecting a job.
 *
 * color/notes are echoed back here (not persisted by this response's
 * creator — Estimate has no home for them) purely as an explicit,
 * backend-confirmed round trip of what was submitted: the frontend is
 * expected to forward them unchanged on the follow-up
 * POST /api/payments/initiate call (InitiatePaymentRequest.color/notes),
 * which is what actually carries them onto the Payment row.
 */
public class OrderAwaitingPaymentResponse {

    @JsonProperty("status")
    private final String status = "awaiting_payment";

    private Estimate estimate;

    @JsonProperty("listing_id")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Long listingId;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String color;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String notes;

    public OrderAwaitingPaymentResponse(Estimate estimate, Long listingId) {
        this(estimate, listingId, null, null);
    }

    public OrderAwaitingPaymentResponse(Estimate estimate, Long listingId, String color, String notes) {
        this.estimate = estimate;
        this.listingId = listingId;
        this.color = color;
        this.notes = notes;
    }

    public String getStatus() { return status; }

    public Estimate getEstimate() { return estimate; }
    public void setEstimate(Estimate estimate) { this.estimate = estimate; }

    public Long getListingId() { return listingId; }
    public void setListingId(Long listingId) { this.listingId = listingId; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
