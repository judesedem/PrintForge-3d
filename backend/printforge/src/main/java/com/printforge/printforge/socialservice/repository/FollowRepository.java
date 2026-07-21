package com.printforge.printforge.socialservice.repository;

import com.printforge.printforge.socialservice.model.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface FollowRepository extends JpaRepository<Follow, Long> {
    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    // @Transactional is required here specifically: a void-returning
    // derived delete (no @Modifying) is implemented as "load matching
    // entities, then entityManager.remove() each" — Spring Data's
    // repository proxy defaults query methods to a read-only transaction,
    // which that remove() call can't run under. Confirmed empirically via
    // FollowCountsIntegrationTest — without this, calling this method
    // from FollowController (which has no service layer/transaction of
    // its own, same as MarketplaceController's favorite endpoints) threw
    // "No EntityManager with actual transaction available for current
    // thread". Flagged in Handoff.md: FavoriteRepository
    // .deleteByUserIdAndListingId() has the exact same shape and likely
    // has the identical latent bug — out of scope to fix here.
    @Transactional
    void deleteByFollowerIdAndFollowingId(Long followerId, Long followingId);

    /** Follower count for a designer — how many users follow them. */
    long countByFollowingId(Long followingId);

    /** Following count for a user — how many designers they follow. */
    long countByFollowerId(Long followerId);

    /** Backs following.tsx — the designers a user follows. */
    List<Follow> findByFollowerId(Long followerId);
}
