package com.printforge.order.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

// Field allowlist for PUT /api/job-service/print-jobs/{id}. Only notes and
// color are caller-editable here — status/assignedPrinter/operatorNotes/
// trackingNumber/estimateId/userId are staff-only and go through the
// dedicated PATCH /{id}/status endpoint instead.
//
// notes has no @NotBlank (#71): PrintJobService.updateJobFields() already
// treats a null notes as "leave unchanged", so the field is legitimately
// optional on every update call — matching the existing behavior rather
// than changing it.
@Getter
@Setter
public class UpdateJobRequest {

    @Size(max = 500, message = "Notes must be 500 characters or fewer")
    private String notes;

    private String color;
}
