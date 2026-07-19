package com.printforge.printforge.marketplaceservice.exception;

/**
 * Thrown when a listing create/update request supplies a value that fails
 * validation — e.g. a category outside the fixed GEARS/DRONES/ENCLOSURES/
 * MINIATURES/ARTICULATED/OTHER set.
 */
public class InvalidListingInputException extends RuntimeException {

    public InvalidListingInputException(String message) {
        super(message);
    }
}
