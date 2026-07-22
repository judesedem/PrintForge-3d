package com.printforge.marketplace.moderationservice.exception;

/**
 * Thrown when a report create/update request supplies a value that fails
 * validation — e.g. a targetType outside LISTING/USER, or a status outside
 * the set an admin is allowed to set it to.
 */
public class InvalidReportInputException extends RuntimeException {

    public InvalidReportInputException(String message) {
        super(message);
    }
}
