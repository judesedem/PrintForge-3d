package com.printforge.marketplace.marketplaceservice.exception;

public class AlreadyFavoritedException extends RuntimeException {
    public AlreadyFavoritedException(Long listingId) {
        super("Listing already favorited: " + listingId);
    }
}
