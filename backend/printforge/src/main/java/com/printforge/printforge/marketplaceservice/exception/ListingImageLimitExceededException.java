package com.printforge.printforge.marketplaceservice.exception;

/**
 * Thrown when POST /api/marketplace/{id}/images would push a listing's
 * gallery past MarketplaceController.MAX_IMAGES_PER_LISTING.
 */
public class ListingImageLimitExceededException extends RuntimeException {
    public ListingImageLimitExceededException(String message) {
        super(message);
    }
}
