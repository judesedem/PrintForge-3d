package com.printforge.printforge.marketplaceservice.controller;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.marketplaceservice.repository.FavoriteRepository;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real Spring context + real DB — this is specifically the test that
 * proves FavoriteRepository.deleteByUserIdAndListingId() (which just had
 * @Transactional added, same fix and same reason as
 * FollowRepository.deleteByFollowerIdAndFollowingId() earlier this
 * session) actually works end to end via
 * MarketplaceController.unfavoriteListing(), which — like
 * FollowController.unfollowUser() — has no service layer/transaction of
 * its own. A mocked-repository unit test would not exercise the real
 * transaction behavior the bug was in, so this needs the real DB, same
 * reasoning as FollowCountsIntegrationTest.
 *
 * No prior test existed for POST/DELETE /api/marketplace/{id}/favorite at
 * all before this fix.
 *
 * Run with: ./mvnw test -Dtest=MarketplaceFavoriteIntegrationTest
 */
@SpringBootTest
class MarketplaceFavoriteIntegrationTest {

    @Autowired MarketplaceController marketplaceController;
    @Autowired FavoriteRepository favoriteRepository;
    @Autowired DesignListingRepository listingRepository;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private Long studentId;
    private Long designerId;
    private Long listingId;

    @AfterEach
    void cleanUp() {
        if (studentId != null && listingId != null) {
            favoriteRepository.deleteByUserIdAndListingId(studentId, listingId);
        }
        if (listingId != null) listingRepository.deleteById(listingId);
        if (studentId != null) userRepository.deleteById(studentId);
        if (designerId != null) userRepository.deleteById(designerId);
    }

    @Test
    void favoritingThenUnfavoritingUpdatesTheCountAndClearsTheFavoriteRow() {
        User designer = User.builder()
                .fullName("Favorite Test Designer")
                .email("favorite-test-designer@printforge.test")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.DESIGNER)
                .build();
        designer = userRepository.save(designer);
        designerId = designer.getUserId();

        User student = User.builder()
                .fullName("Favorite Test Student")
                .email("favorite-test-student@printforge.test")
                .password(passwordEncoder.encode("throwaway"))
                .role(Role.STUDENT)
                .build();
        student = userRepository.save(student);
        studentId = student.getUserId();

        DesignListing listing = new DesignListing();
        listing.setDesignerId(designerId);
        listing.setTitle("Favorite Test Listing");
        listing.setBasePrice(BigDecimal.TEN);
        listing.setStatus("PUBLISHED");
        listing.setOwnershipAttested(true);
        listing = listingRepository.save(listing);
        listingId = listing.getId();

        Authentication studentAuth = new UsernamePasswordAuthenticationToken(
                student.getEmail(), null, Set.of(new SimpleGrantedAuthority("ROLE_STUDENT")));

        // Favorite.
        ResponseEntity<DesignListing> favoriteResponse = marketplaceController.favoriteListing(listingId, studentAuth);

        assertEquals(1, favoriteResponse.getBody().getFavoriteCount());
        assertTrue(favoriteRepository.existsByUserIdAndListingId(studentId, listingId));

        // Unfavorite — this is the call that exercises the just-fixed
        // deleteByUserIdAndListingId().
        ResponseEntity<DesignListing> unfavoriteResponse = assertDoesNotThrow(
                () -> marketplaceController.unfavoriteListing(listingId, studentAuth));

        assertEquals(0, unfavoriteResponse.getBody().getFavoriteCount());
        assertFalse(favoriteRepository.existsByUserIdAndListingId(studentId, listingId),
                "the Favorite row should actually be deleted, not just appear deleted due to a swallowed exception");

        // Confirm the count persisted for real, not just on the in-memory response object.
        DesignListing reloaded = listingRepository.findById(listingId).orElseThrow();
        assertEquals(0, reloaded.getFavoriteCount());
    }
}
