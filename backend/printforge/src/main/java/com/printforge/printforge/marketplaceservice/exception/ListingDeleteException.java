package com.printforge.printforge.marketplaceservice.exception;

/**
 * Thrown when DELETE /api/marketplace/{id} is blocked because a PENDING
 * payment currently references the listing.
 */
public class ListingDeleteException extends RuntimeException {

    public ListingDeleteException(String message) {
        super(message);
    }
}
