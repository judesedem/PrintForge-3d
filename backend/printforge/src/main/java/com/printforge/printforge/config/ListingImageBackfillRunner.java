package com.printforge.printforge.config;

import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.model.ListingImage;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.marketplaceservice.repository.ListingImageRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * One-time backfill for the multi-image gallery feature: every pre-existing
 * DesignListing that already has a thumbnailUrl gets a corresponding
 * ListingImage row at displayOrder 0, so DesignListing.thumbnailUrl can act
 * as a derived read of "the image at position 0" instead of an independent
 * field. Idempotent — skips any listing that already has at least one
 * ListingImage row, so it's safe to leave running on every startup. New
 * listings never need this: MarketplaceController.createListing() creates
 * their displayOrder=0 row directly.
 */
@Slf4j
@Component
public class ListingImageBackfillRunner implements CommandLineRunner {

    private final DesignListingRepository listingRepository;
    private final ListingImageRepository listingImageRepository;

    public ListingImageBackfillRunner(DesignListingRepository listingRepository,
                                       ListingImageRepository listingImageRepository) {
        this.listingRepository = listingRepository;
        this.listingImageRepository = listingImageRepository;
    }

    @Override
    public void run(String... args) {
        List<DesignListing> listingsWithThumbnails = listingRepository.findByThumbnailUrlIsNotNull();
        int backfilled = 0;
        for (DesignListing listing : listingsWithThumbnails) {
            if (listingImageRepository.countByListingId(listing.getId()) > 0) continue;

            ListingImage image = new ListingImage();
            image.setListingId(listing.getId());
            image.setImageUrl(listing.getThumbnailUrl());
            image.setImageFileId(listing.getThumbnailFileId());
            image.setDisplayOrder(0);
            listingImageRepository.save(image);
            backfilled++;
        }
        if (backfilled > 0) {
            log.info("Backfilled {} listing(s) with a displayOrder=0 ListingImage row", backfilled);
        }
    }
}
