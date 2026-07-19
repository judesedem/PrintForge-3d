package com.printforge.printforge.marketplaceservice.repository;

import com.printforge.printforge.marketplaceservice.model.DesignListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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

    @Query("SELECT dl.designerId, SUM(dl.totalEarnings) FROM DesignListing dl GROUP BY dl.designerId")
    List<Object[]> sumEarningsByDesigner();
}
