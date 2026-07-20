package com.printforge.printforge.moderationservice.exception;

/** Thrown when GET /api/admin/moderation-log/{targetType}/{targetId} gets a targetType outside LISTING/USER/REPORT. */
public class InvalidModerationLogQueryException extends RuntimeException {

    public InvalidModerationLogQueryException(String message) {
        super(message);
    }
}
