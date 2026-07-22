package com.printforge.payment.marketplaceservice.repository;

import com.printforge.payment.marketplaceservice.model.DesignListing;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DesignListingRepository extends JpaRepository<DesignListing, Long> {

    List<DesignListing> findByStatus(String status);

    List<DesignListing> findByDesignerId(Long designerId);

    // Used by GET /api/users/{id}/designs — public-facing "designer profile"
    // listing, so only PUBLISHED work should show up, newest first.
    List<DesignListing> findByDesignerIdAndStatusOrderByCreatedAtDesc(Long designerId, String status);

    boolean existsByFileId(Long fileId);

    // Used by DELETE /api/files/{id}: a file backing a still-PUBLISHED
    // listing can't be deleted out from under it.
    boolean existsByFileIdAndStatus(Long fileId, String status);

    @Query("SELECT dl.designerId, SUM(dl.totalEarnings) FROM DesignListing dl GROUP BY dl.designerId")
    List<Object[]> sumEarningsByDesigner();

    // Backs GET /api/marketplace (?sort=newest, the default). The suspended-
    // designer exclusion used to happen in-memory in
    // MarketplaceController.excludeModerated(), applied after fetching the
    // full unpaginated list — fine when nothing counted rows, but now that
    // the response carries a real totalElements/totalPages, filtering after
    // the fact would let a suspended designer's rows still inflate that
    // count. Pulled the (only non-redundant part of) that filter into the
    // query itself instead; adminUnpublished is not repeated here since it
    // always implies status=DRAFT (see AdminService.unpublishListing()),
    // never PUBLISHED, so the status filter already excludes it.
    @Query("SELECT dl FROM DesignListing dl WHERE dl.status = 'PUBLISHED' " +
            "AND (:category IS NULL OR LOWER(dl.category) = LOWER(:category)) " +
            "AND dl.designerId NOT IN (SELECT u.userId FROM User u WHERE u.suspended = true) " +
            "ORDER BY dl.createdAt DESC")
    Page<DesignListing> findPublishedNewest(@Param("category") String category, Pageable pageable);

    // Backs GET /api/marketplace?sort=trending. Same PUBLISHED/category/
    // suspended-designer filtering as findPublishedNewest above, ordered by
    // a weighted composite score instead: favorites (weight passed in,
    // MarketplaceController.TRENDING_FAVORITE_WEIGHT) signal stronger buyer
    // intent than downloads (TRENDING_DOWNLOAD_WEIGHT), so they count for
    // more. createdAt DESC breaks ties between equally-scored listings.
    @Query("SELECT dl FROM DesignListing dl WHERE dl.status = 'PUBLISHED' " +
            "AND (:category IS NULL OR LOWER(dl.category) = LOWER(:category)) " +
            "AND dl.designerId NOT IN (SELECT u.userId FROM User u WHERE u.suspended = true) " +
            "ORDER BY (dl.downloadCount * :downloadWeight + dl.favoriteCount * :favoriteWeight) DESC, dl.createdAt DESC")
    Page<DesignListing> findPublishedTrending(@Param("category") String category,
                                               @Param("downloadWeight") int downloadWeight,
                                               @Param("favoriteWeight") int favoriteWeight,
                                               Pageable pageable);
}
