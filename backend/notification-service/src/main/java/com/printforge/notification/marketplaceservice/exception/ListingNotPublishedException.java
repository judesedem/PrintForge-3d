package com.printforge.notification.marketplaceservice.exception;

public class ListingNotPublishedException extends RuntimeException {
    public ListingNotPublishedException(Long id) {
        super("Listing " + id + " is not published. Only PUBLISHED listings can be ordered.");
    }
}
