package com.printforge.printforge.marketplaceservice.exception;

/**
 * Thrown when DELETE /api/marketplace/{id}/images/{imageId} is blocked
 * because it targets the listing's last remaining image — a listing must
 * always have at least one image, so removing that one has to go through
 * replacing the thumbnail instead of this delete endpoint.
 */
public class ListingImageDeleteException extends RuntimeException {
    public ListingImageDeleteException(String message) {
        super(message);
    }
}
