package com.printforge.printforge.estimateservice.exception;

/**
 * Thrown when quality or materialType isn't one of the recognized values.
 * Previously an unrecognized value was silently treated as the default
 * tier/material with no error — a typo like "stadnard" or "plastic" would
 * quietly produce a price based on the wrong assumption instead of failing.
 */
public class InvalidEstimateInputException extends RuntimeException {

    public InvalidEstimateInputException(String message) {
        super(message);
    }
}
