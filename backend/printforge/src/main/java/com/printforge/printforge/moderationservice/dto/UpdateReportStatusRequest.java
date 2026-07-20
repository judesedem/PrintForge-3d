package com.printforge.printforge.moderationservice.dto;

import lombok.Getter;
import lombok.Setter;

// status is a String, not the ReportStatus enum — same reasoning as
// CreateReportRequest.targetType: a bad value should fail as a clean 400
// (InvalidReportInputException), not an unhandled Jackson error.
@Getter
@Setter
public class UpdateReportStatusRequest {

    private String status;
}
