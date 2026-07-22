package com.printforge.printforge.marketplaceservice.exception;

public class ListingImageNotFoundException extends RuntimeException {
    public ListingImageNotFoundException(Long id) {
        super("Listing image not found: " + id);
    }
}
