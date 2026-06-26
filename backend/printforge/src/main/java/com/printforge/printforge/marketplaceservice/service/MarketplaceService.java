package com.printforge.printforge.marketplaceservice.service;

import com.printforge.printforge.marketplaceservice.model.MarketplaceItem;
import com.printforge.printforge.marketplaceservice.repository.MarketplaceItemRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class MarketplaceService {

    private final MarketplaceItemRepository repository;

    public MarketplaceService(MarketplaceItemRepository repository) {
        this.repository = repository;
    }

    // 1. Create a new listing (Starts as a Draft automatically)
    public MarketplaceItem createItem(Long designerId, Long fileId, String title, String description, BigDecimal price, String thumbnailUrl) {
        MarketplaceItem item = new MarketplaceItem();
        item.setDesignerId(designerId);
        item.setFileId(fileId);
        item.setTitle(title);
        item.setDescription(description);
        item.setPrice(price);
        item.setThumbnailUrl(thumbnailUrl);
        return repository.save(item);
    }

    // 2. Get the public storefront (Only published items)
    public List<MarketplaceItem> getStorefrontItems() {
        return repository.findByIsPublishedTrueOrderByCreatedAtDesc();
    }

    // 3. Get a designer's dashboard (All their items: drafts + live)
    public List<MarketplaceItem> getDesignerItems(Long designerId) {
        return repository.findByDesignerIdOrderByCreatedAtDesc(designerId);
    }

    // 4. Toggle the Publish Status (Make it live or take it down)
    public MarketplaceItem togglePublishStatus(Long itemId, boolean isPublished) {
        MarketplaceItem item = repository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found with ID: " + itemId));
        item.setPublished(isPublished);
        return repository.save(item);
    }
}