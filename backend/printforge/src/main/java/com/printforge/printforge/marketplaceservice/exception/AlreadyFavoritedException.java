package com.printforge.printforge.marketplaceservice.exception;

public class AlreadyFavoritedException extends RuntimeException {
    public AlreadyFavoritedException(Long listingId) {
        super("Listing already favorited: " + listingId);
    }
}
