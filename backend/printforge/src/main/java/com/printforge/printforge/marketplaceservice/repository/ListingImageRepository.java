package com.printforge.printforge.marketplaceservice.repository;

import com.printforge.printforge.marketplaceservice.model.ListingImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface ListingImageRepository extends JpaRepository<ListingImage, Long> {

    List<ListingImage> findByListingIdOrderByDisplayOrderAsc(Long listingId);

    // Scopes a delete-by-id to the listing making the request, so one
    // designer can never delete another's image by guessing an id.
    Optional<ListingImage> findByIdAndListingId(Long id, Long listingId);

    long countByListingId(Long listingId);

    // @Transactional is required here for the same reason as
    // FavoriteRepository.deleteByUserIdAndListingId(): a void-returning
    // derived delete (no @Modifying) runs as "load matching entities, then
    // entityManager.remove() each" under a transaction, which Spring Data's
    // default read-only query-method transaction doesn't allow. Called
    // directly from MarketplaceController.deleteListing(), which has no
    // service layer/transaction of its own, same as the favorite/follow
    // delete paths.
    @Transactional
    void deleteByListingId(Long listingId);
}
