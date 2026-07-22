package com.printforge.marketplace.moderationservice.model;

/**
 * Every action type this audit log currently records. Scoped narrowly
 * per #66's pulled-forward slice — this is not meant to cover every
 * admin/user action in the system, only the ones flagged this session.
 */
public enum ModerationActionType {
    ADMIN_UNPUBLISH,
    ADMIN_REPUBLISH,
    ADMIN_SUSPEND_USER,
    ADMIN_REPORT_STATUS_CHANGE,
    DESIGNER_PUBLISH,
    DESIGNER_UNPUBLISH
}
