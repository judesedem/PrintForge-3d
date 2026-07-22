package com.printforge.admin.moderationservice.model;

/** Lifecycle of a Report, from submission through admin resolution. */
public enum ReportStatus {
    PENDING, REVIEWED, DISMISSED, ACTIONED
}
