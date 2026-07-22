package com.printforge.marketplace.notificationservice.exception;

/**
 * Thrown when a notification record can't be found for the given id.
 * Replaces the generic RuntimeException that NotificationService used to
 * throw, which the GlobalExceptionHandler's catch-all turned into a 500
 * "An unexpected error occurred" instead of a proper 404.
 */
public class NotificationNotFoundException extends RuntimeException {

    public NotificationNotFoundException(Long id) {
        super("No notification found with id " + id);
    }
}
