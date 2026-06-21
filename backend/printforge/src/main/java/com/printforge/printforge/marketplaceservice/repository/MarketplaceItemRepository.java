package com.printforge.printforge.marketplaceservice.repository;

import com.printforge.printforge.marketplaceservice.model.MarketplaceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarketplaceItemRepository extends JpaRepository<MarketplaceItem, Long> {

    // For the public storefront: Show only live items, newest first
    List<MarketplaceItem> findByIsPublishedTrueOrderByCreatedAtDesc();

    // For the designer's dashboard: Show all their items (drafts + live)
    List<MarketplaceItem> findByDesignerIdOrderByCreatedAtDesc(Long designerId);
}