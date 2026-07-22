package com.printforge.notification.marketplaceservice.exception;

public class FavoriteNotFoundException extends RuntimeException {
    public FavoriteNotFoundException(Long listingId) {
        super("Listing not favorited: " + listingId);
    }
}
