package com.printforge.marketplace.config;

import com.printforge.marketplace.entity.User;
import com.printforge.marketplace.marketplaceservice.model.DesignListing;
import com.printforge.marketplace.marketplaceservice.repository.DesignListingRepository;
import com.printforge.marketplace.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Seeds the marketplace with pre-populated design listings so students
 * immediately see designs to browse and purchase. Listings are attributed
 * to the DESIGNER user seeded by auth-service's DataSeeder.
 *
 * Only runs if no PUBLISHED listings exist yet (idempotent).
 */
@Component
public class MarketplaceSeeder implements CommandLineRunner {

    private final DesignListingRepository listingRepository;
    private final UserRepository userRepository;

    public MarketplaceSeeder(DesignListingRepository listingRepository,
                              UserRepository userRepository) {
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        // Only seed if the marketplace is empty
        if (listingRepository.count() > 0) {
            System.out.println("Marketplace already has listings — skipping seeder.");
            return;
        }

        // Find the designer user — they may not exist yet if auth-service
        // hasn't finished its DataSeeder, but marketplace-service shares
        // the same DB. We look up by email.
        User designer = userRepository.findByEmail("designer@printforge.com").orElse(null);
        Long designerId = designer != null ? designer.getUserId() : 1L;

        LocalDateTime now = LocalDateTime.now();

        List<DesignListing> seeds = List.of(
            createListing(designerId,
                "Minimalist Desk Organizer",
                "Clean, modular desk organizer with compartments for pens, cables, and small items. Prints without supports.",
                new BigDecimal("45.00"),
                "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80",
                "ENCLOSURES",
                now.minusDays(14)),
            createListing(designerId,
                "Stackable Planter Set",
                "Modular stackable planters that interlock vertically. Perfect for herbs and succulents. Self-watering design.",
                new BigDecimal("65.00"),
                "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80",
                "OTHER",
                now.minusDays(12)),
            createListing(designerId,
                "Precision Tool Holder",
                "Wall-mounted tool organizer with slots for screwdrivers, pliers, and hex keys. Honeycomb pattern for strength.",
                new BigDecimal("58.00"),
                "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
                "ENCLOSURES",
                now.minusDays(10)),
            createListing(designerId,
                "Articulated Dragon",
                "Fully articulated dragon with movable joints. Prints-in-place — no assembly required. 12 segments.",
                new BigDecimal("35.00"),
                "https://images.unsplash.com/photo-1490655796793-0f1ff390f7a7?auto=format&fit=crop&w=800&q=80",
                "ARTICULATED",
                now.minusDays(8)),
            createListing(designerId,
                "Drone Landing Gear",
                "Lightweight reinforced landing gear for DJI Mini series. Snap-fit attachment, no tools needed.",
                new BigDecimal("28.00"),
                "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
                "DRONES",
                now.minusDays(6)),
            createListing(designerId,
                "Planetary Gear Set",
                "Functional planetary gear system with sun, planet, and ring gears. Great for robotics and mechanical demos.",
                new BigDecimal("42.00"),
                "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80",
                "GEARS",
                now.minusDays(4)),
            createListing(designerId,
                "Raspberry Pi 5 Case",
                "Slim case for Raspberry Pi 5 with ventilation slots, GPIO access, and camera cable routing.",
                new BigDecimal("18.00"),
                "https://images.pexels.com/photos/4488649/pexels-photo-4488649.jpeg?auto=compress&cs=tinysrgb&w=800",
                "ENCLOSURES",
                now.minusDays(3)),
            createListing(designerId,
                "Miniature Castle Tower",
                "Detailed medieval castle tower for tabletop gaming. Multi-piece design with removable roof.",
                new BigDecimal("52.00"),
                "https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=800",
                "MINIATURES",
                now.minusDays(1))
        );

        listingRepository.saveAll(seeds);
        System.out.println("Seeded " + seeds.size() + " marketplace design listings.");
    }

    private DesignListing createListing(Long designerId, String title, String description,
                                         BigDecimal price, String thumbnailUrl, String category,
                                         LocalDateTime createdAt) {
        DesignListing listing = new DesignListing();
        listing.setDesignerId(designerId);
        listing.setTitle(title);
        listing.setDescription(description);
        listing.setBasePrice(price);
        listing.setThumbnailUrl(thumbnailUrl);
        listing.setCategory(category);
        listing.setStatus("PUBLISHED");
        listing.setCreatedAt(createdAt);
        listing.setPublishedAt(createdAt);
        listing.setOwnershipAttested(true);
        listing.setTotalOrders(0);
        listing.setTotalEarnings(BigDecimal.ZERO);
        listing.setFavoriteCount(0);
        listing.setDownloadCount(0);
        return listing;
    }
}
