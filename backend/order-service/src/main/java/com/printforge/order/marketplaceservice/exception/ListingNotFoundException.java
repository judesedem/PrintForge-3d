package com.printforge.order.marketplaceservice.exception;

public class ListingNotFoundException extends RuntimeException {
    public ListingNotFoundException(Long id) {
        super("Listing not found: " + id);
    }
}
