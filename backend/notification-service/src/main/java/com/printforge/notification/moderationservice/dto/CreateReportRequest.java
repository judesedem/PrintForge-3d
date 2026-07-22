package com.printforge.notification.moderationservice.dto;

import lombok.Getter;
import lombok.Setter;

// targetType is a String here (not the ReportTargetType enum directly) so an
// invalid value fails as a clean, service-layer InvalidReportInputException
// (400) rather than a Jackson enum-deserialization error escaping past
// GlobalExceptionHandler's specific handlers into the generic 500 fallback.
@Getter
@Setter
public class CreateReportRequest {

    private String targetType;
    private Long targetId;
    private String reason;
}
