package com.printforge.printforge.queueservice.exception;

/**
 * Thrown when updateJobStatus() is given a status string that isn't one of
 * the recognized values. Previously any string was accepted and uppercased
 * as-is, so a typo silently created a permanently broken job state.
 */
public class InvalidJobStatusException extends RuntimeException {

    public InvalidJobStatusException(String message) {
        super(message);
    }
}
