package com.printforge.notification.marketplaceservice.exception;

public class ListingNotFoundException extends RuntimeException {
    public ListingNotFoundException(Long id) {
        super("Listing not found: " + id);
    }
}
