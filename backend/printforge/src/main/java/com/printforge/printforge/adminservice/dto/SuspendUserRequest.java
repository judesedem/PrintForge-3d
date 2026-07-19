package com.printforge.printforge.adminservice.dto;

import lombok.Getter;
import lombok.Setter;

// reason is optional — same "no reason supplied" fallback pattern as
// PrintJobFacadeController.rejectJob()'s reason param; not persisted
// anywhere, only folded into the notification sent to the affected user.
@Getter
@Setter
public class SuspendUserRequest {

    private boolean suspended;
    private String reason;
}
