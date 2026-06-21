package com.printforge.printforge.marketplaceservice.controller;

import com.printforge.printforge.marketplaceservice.model.MarketplaceItem;
import com.printforge.printforge.marketplaceservice.service.MarketplaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/marketplace")
public class MarketplaceController {

    private final MarketplaceService marketplaceService;

    public MarketplaceController(MarketplaceService marketplaceService) {
        this.marketplaceService = marketplaceService;
    }

    // 1. List a new item (Designer Dashboard)
    @PostMapping
    public ResponseEntity<MarketplaceItem> createItem(
            @RequestParam Long designerId,
            @RequestParam Long fileId,
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam BigDecimal price,
            @RequestParam String thumbnailUrl) {
        return ResponseEntity.ok(marketplaceService.createItem(designerId, fileId, title, description, price, thumbnailUrl));
    }

    // 2. View the public storefront
    @GetMapping("/storefront")
    public ResponseEntity<List<MarketplaceItem>> getStorefront() {
        return ResponseEntity.ok(marketplaceService.getStorefrontItems());
    }

    // 3. View designer's inventory (Designer Dashboard)
    @GetMapping("/designer/{designerId}")
    public ResponseEntity<List<MarketplaceItem>> getDesignerInventory(@PathVariable Long designerId) {
        return ResponseEntity.ok(marketplaceService.getDesignerItems(designerId));
    }

    // 4. Publish or Unpublish an item
    @PatchMapping("/{itemId}/publish")
    public ResponseEntity<MarketplaceItem> togglePublish(
            @PathVariable Long itemId,
            @RequestParam boolean isPublished) {
        return ResponseEntity.ok(marketplaceService.togglePublishStatus(itemId, isPublished));
    }
}