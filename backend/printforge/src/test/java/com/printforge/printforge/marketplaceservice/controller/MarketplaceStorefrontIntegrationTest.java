package com.printforge.printforge.marketplaceservice.controller;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real Spring context + real DB — category filtering, ?sort=, and
 * pagination all need to be verified against actual query execution/order,
 * not a mock, same rationale as MarketplaceFavoriteIntegrationTest.
 *
 * Run with: ./mvnw test -Dtest=MarketplaceStorefrontIntegrationTest
 */
@SpringBootTest
class MarketplaceStorefrontIntegrationTest {

    @Autowired MarketplaceController marketplaceController;
    @Autowired DesignListingRepository listingRepository;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private Long designerId;
    private final List<Long> listingIds = new ArrayList<>();
    private Authentication callerAuth;

    private DesignListing seedListing(String title, String category, int downloadCount,
                                       int favoriteCount, LocalDateTime createdAt) {
        DesignListing listing = new DesignListing();
        listing.setDesignerId(designerId);
        listing.setTitle(title);
        listing.setBasePrice(BigDecimal.TEN);
        listing.setStatus("PUBLISHED");
        listing.setOwnershipAttested(true);
        listing.setCategory(category);
        listing = listingRepository.save(listing);
        // createdAt is stamped by @PrePersist at save time; overwrite it
        // with a controlled value afterwards so ordering is deterministic
        // instead of depending on real wall-clock gaps between saves.
        listing.setDownloadCount(downloadCount);
        listing.setFavoriteCount(favoriteCount);
        listing.setCreatedAt(createdAt);
        listing = listingRepository.save(listing);
        listingIds.add(listing.getId());
        return listing;
    }

    @AfterEach
    void cleanUp() {
        listingIds.forEach(listingRepository::deleteById);
        if (designerId != null) userRepository.deleteById(designerId);
    }

    private void setUpDesignerAndAuth() {
        User designer = User.builder()
                .fullName("Storefront Test Designer")
                .email("storefront-test-designer@printforge.test")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.DESIGNER)
                .build();
        designer = userRepository.save(designer);
        designerId = designer.getUserId();
        callerAuth = new UsernamePasswordAuthenticationToken(
                designer.getEmail(), null, Set.of(new SimpleGrantedAuthority("ROLE_DESIGNER")));
    }

    @Test
    void categoryFilterIsCaseInsensitiveAndOnlyReturnsMatchingListings() {
        setUpDesignerAndAuth();
        LocalDateTime now = LocalDateTime.now();
        seedListing("Drone A", "DRONES", 0, 0, now);
        seedListing("Gear A", "GEARS", 0, 0, now);

        ResponseEntity<Page<DesignListing>> response = marketplaceController.getStorefront(
                "drones", "newest", PageRequest.of(0, 20), callerAuth);

        List<DesignListing> content = response.getBody().getContent();
        assertTrue(content.stream().allMatch(l -> "DRONES".equals(l.getCategory())));
        assertTrue(content.stream().anyMatch(l -> "Drone A".equals(l.getTitle())));
        assertTrue(content.stream().noneMatch(l -> "Gear A".equals(l.getTitle())));
    }

    @Test
    void trendingSortOrdersByCompositeScoreDescending() {
        setUpDesignerAndAuth();
        LocalDateTime now = LocalDateTime.now();
        // score = downloads*1 + favorites*2
        DesignListing low = seedListing("Trend Low", "OTHER", 1, 0, now);       // score 1
        DesignListing high = seedListing("Trend High", "OTHER", 0, 10, now);    // score 20
        DesignListing mid = seedListing("Trend Mid", "OTHER", 5, 2, now);       // score 9

        ResponseEntity<Page<DesignListing>> response = marketplaceController.getStorefront(
                "OTHER", "trending", PageRequest.of(0, 20), callerAuth);

        List<Long> orderedIds = response.getBody().getContent().stream().map(DesignListing::getId).toList();
        int highIdx = orderedIds.indexOf(high.getId());
        int midIdx = orderedIds.indexOf(mid.getId());
        int lowIdx = orderedIds.indexOf(low.getId());
        assertTrue(highIdx < midIdx, "highest score should sort before mid score");
        assertTrue(midIdx < lowIdx, "mid score should sort before lowest score");
    }

    @Test
    void newestSortAndDefaultBothOrderByCreatedAtDescending() {
        setUpDesignerAndAuth();
        LocalDateTime now = LocalDateTime.now();
        DesignListing oldest = seedListing("Oldest", "OTHER", 0, 0, now.minusDays(2));
        DesignListing newest = seedListing("Newest", "OTHER", 0, 0, now);
        DesignListing middle = seedListing("Middle", "OTHER", 0, 0, now.minusDays(1));

        ResponseEntity<Page<DesignListing>> explicitSort = marketplaceController.getStorefront(
                "OTHER", "newest", PageRequest.of(0, 20), callerAuth);
        ResponseEntity<Page<DesignListing>> defaultSort = marketplaceController.getStorefront(
                "OTHER", null, PageRequest.of(0, 20), callerAuth);

        for (ResponseEntity<Page<DesignListing>> response : List.of(explicitSort, defaultSort)) {
            List<Long> orderedIds = response.getBody().getContent().stream().map(DesignListing::getId).toList();
            assertEquals(
                    List.of(newest.getId(), middle.getId(), oldest.getId()),
                    orderedIds);
        }
    }

    @Test
    void pageZeroOfSizeTwoWithFiveListingsReturnsCorrectPageMetadata() {
        setUpDesignerAndAuth();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 0; i < 5; i++) {
            seedListing("Paged " + i, "MINIATURES", 0, 0, now.minusMinutes(i));
        }

        ResponseEntity<Page<DesignListing>> response = marketplaceController.getStorefront(
                "MINIATURES", "newest", PageRequest.of(0, 2), callerAuth);

        Page<DesignListing> page = response.getBody();
        assertEquals(2, page.getContent().size());
        assertEquals(5, page.getTotalElements());
        assertEquals(3, page.getTotalPages());
        assertEquals(0, page.getNumber());
        assertEquals(2, page.getSize());
        assertTrue(page.isFirst());
        assertFalse(page.isLast());
    }

    @Test
    void allFourCombinationQueriesReturnNonErrorResponses() {
        setUpDesignerAndAuth();
        seedListing("Combo A", "DRONES", 3, 1, LocalDateTime.now());

        assertDoesNotThrow(() -> marketplaceController.getStorefront(
                null, null, PageRequest.of(0, 20), callerAuth));
        assertDoesNotThrow(() -> marketplaceController.getStorefront(
                null, "trending", PageRequest.of(0, 20), callerAuth));
        assertDoesNotThrow(() -> marketplaceController.getStorefront(
                "Drones", null, PageRequest.of(0, 20), callerAuth));
        assertDoesNotThrow(() -> marketplaceController.getStorefront(
                "Drones", "trending", PageRequest.of(1, 10), callerAuth));
    }
}
