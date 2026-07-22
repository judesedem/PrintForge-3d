package com.printforge.marketplace.marketplaceservice.exception;

public class ListingNotPublishedException extends RuntimeException {
    public ListingNotPublishedException(Long id) {
        super("Listing " + id + " is not published. Only PUBLISHED listings can be ordered.");
    }
}
