package com.printforge.printforge.marketplaceservice.repository;

import com.printforge.printforge.marketplaceservice.model.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    boolean existsByUserIdAndListingId(Long userId, Long listingId);
    List<Favorite> findByUserId(Long userId);
    void deleteByUserIdAndListingId(Long userId, Long listingId);
    long countByListingId(Long listingId);
}
