package com.printforge.printforge.adminservice.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

// reason is optional — same "no reason supplied" fallback pattern as
// PrintJobFacadeController.rejectJob()'s reason param; not persisted
// anywhere, only folded into the notification sent to the affected user.
//
// #71 deliberately did NOT add @NotBlank here despite the task's "probably
// shouldn't be blank for an admin action" suggestion: that would silently
// flip reason from optional to required, reversing the fallback behavior
// documented above. Flagged rather than guessed — see Handoff.md. @Size
// alone still enforces the length cap while leaving a null/blank reason
// legal.
@Getter
@Setter
public class SuspendUserRequest {

    private boolean suspended;

    @Size(max = 500, message = "Reason must be 500 characters or fewer")
    private String reason;
}
