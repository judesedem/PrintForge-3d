package com.printforge.marketplace.marketplaceservice.repository;

import com.printforge.marketplace.marketplaceservice.model.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    boolean existsByUserIdAndListingId(Long userId, Long listingId);
    List<Favorite> findByUserId(Long userId);

    // @Transactional is required here: a void-returning derived delete
    // (no @Modifying) is implemented as "load matching entities, then
    // entityManager.remove() each" — Spring Data's repository proxy
    // defaults query methods to a read-only transaction, which that
    // remove() call can't run under. Same bug as
    // FollowRepository.deleteByFollowerIdAndFollowingId() (found and
    // fixed the same way earlier this session) — this method has the
    // identical shape and is called directly from
    // MarketplaceController.unfavoriteListing(), which has no service
    // layer/transaction of its own, same as FollowController.
    @Transactional
    void deleteByUserIdAndListingId(Long userId, Long listingId);

    long countByListingId(Long listingId);
}
