package com.printforge.printforge.dto;

import lombok.Getter;
import lombok.Setter;

// Field allowlist for PUT /api/job-service/print-jobs/{id}. Only notes and
// color are caller-editable here — status/assignedPrinter/operatorNotes/
// trackingNumber/estimateId/userId are staff-only and go through the
// dedicated PATCH /{id}/status endpoint instead.
@Getter
@Setter
public class UpdateJobRequest {
    private String notes;
    private String color;
}
