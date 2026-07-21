package com.printforge.printforge.marketplaceservice.controller;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.service.EstimateService;
import com.printforge.printforge.fileservice.storage.FileStorageService;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.marketplaceservice.repository.FavoriteRepository;
import com.printforge.printforge.marketplaceservice.exception.ListingDeleteException;
import com.printforge.printforge.moderationservice.service.ModerationLogService;
import com.printforge.printforge.paymentservice.repository.PaymentRepository;
import com.printforge.printforge.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB — same direct-invocation
 * convention as FileControllerTest/FollowControllerTest. Covers the new
 * optional spec fields (fileFormat/polygonCount/estimatedPrintTimeMinutes/
 * layerHeightMm) on createListing(), and the delete-vs-in-flight-payment
 * guard on deleteListing().
 *
 * Run with: ./mvnw test -Dtest=MarketplaceControllerTest
 */
class MarketplaceControllerTest {

    DesignListingRepository listingRepository;
    EstimateService estimateService;
    FileStorageService fileStorageService;
    UserRepository userRepository;
    FavoriteRepository favoriteRepository;
    ModerationLogService moderationLogService;
    PaymentRepository paymentRepository;
    MarketplaceController controller;
    Authentication designerAuth;

    private static final Long DESIGNER_ID = 7L;
    private static final String DESIGNER_EMAIL = "designer@printforge.test";

    @BeforeEach
    void setUp() {
        listingRepository = Mockito.mock(DesignListingRepository.class);
        estimateService = Mockito.mock(EstimateService.class);
        fileStorageService = Mockito.mock(FileStorageService.class);
        userRepository = Mockito.mock(UserRepository.class);
        favoriteRepository = Mockito.mock(FavoriteRepository.class);
        moderationLogService = Mockito.mock(ModerationLogService.class);
        paymentRepository = Mockito.mock(PaymentRepository.class);
        controller = new MarketplaceController(listingRepository, estimateService, fileStorageService,
                userRepository, favoriteRepository, moderationLogService, paymentRepository);

        User designer = User.builder().userId(DESIGNER_ID).email(DESIGNER_EMAIL).role(Role.DESIGNER).build();
        Mockito.when(userRepository.findByEmail(DESIGNER_EMAIL)).thenReturn(Optional.of(designer));
        Mockito.when(listingRepository.save(Mockito.any(DesignListing.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        designerAuth = new UsernamePasswordAuthenticationToken(DESIGNER_EMAIL, null, java.util.List.of());
    }

    @Test
    void createListingPersistsTheNewSpecFieldsWhenProvided() {
        ResponseEntity<DesignListing> response = controller.createListing(
                1L, "Test Listing", null, BigDecimal.TEN,
                null, null, true,
                "STL", 17960, 95, new BigDecimal("0.20"),
                null, designerAuth);

        DesignListing saved = response.getBody();
        assertEquals("STL", saved.getFileFormat());
        assertEquals(17960, saved.getPolygonCount());
        assertEquals(95, saved.getEstimatedPrintTimeMinutes());
        assertEquals(new BigDecimal("0.20"), saved.getLayerHeightMm());
    }

    @Test
    void createListingLeavesTheNewSpecFieldsNullWhenNotProvided() {
        ResponseEntity<DesignListing> response = controller.createListing(
                1L, "Test Listing", null, BigDecimal.TEN,
                null, null, true,
                null, null, null, null,
                null, designerAuth);

        DesignListing saved = response.getBody();
        assertNull(saved.getFileFormat());
        assertNull(saved.getPolygonCount());
        assertNull(saved.getEstimatedPrintTimeMinutes());
        assertNull(saved.getLayerHeightMm());
    }

    @Test
    void createListingCapturesExactlyWhatWasPassedToTheRepository() {
        controller.createListing(
                1L, "Test Listing", null, BigDecimal.TEN,
                null, null, true,
                "OBJ", 5000, 60, new BigDecimal("0.15"),
                null, designerAuth);

        ArgumentCaptor<DesignListing> captor = ArgumentCaptor.forClass(DesignListing.class);
        Mockito.verify(listingRepository).save(captor.capture());
        assertEquals("OBJ", captor.getValue().getFileFormat());
        assertEquals(5000, captor.getValue().getPolygonCount());
    }

    private DesignListing draftListingOwnedByDesigner(Long listingId) {
        DesignListing listing = new DesignListing();
        listing.setId(listingId);
        listing.setDesignerId(DESIGNER_ID);
        listing.setStatus("DRAFT");
        listing.setTotalOrders(0);
        return listing;
    }

    @Test
    void deletingAListingWithAPendingPaymentInFlightIsRejected() {
        Mockito.when(listingRepository.findById(5L)).thenReturn(Optional.of(draftListingOwnedByDesigner(5L)));
        Mockito.when(paymentRepository.existsByListingIdAndStatus(5L, "PENDING")).thenReturn(true);

        assertThrows(ListingDeleteException.class, () -> controller.deleteListing(5L, designerAuth));
        Mockito.verify(listingRepository, Mockito.never()).delete(Mockito.any());
    }

    @Test
    void deletingAListingWithNoPendingPaymentSucceeds() {
        Mockito.when(listingRepository.findById(5L)).thenReturn(Optional.of(draftListingOwnedByDesigner(5L)));
        Mockito.when(paymentRepository.existsByListingIdAndStatus(5L, "PENDING")).thenReturn(false);

        ResponseEntity<Void> response = controller.deleteListing(5L, designerAuth);

        assertEquals(204, response.getStatusCode().value());
        Mockito.verify(listingRepository).delete(Mockito.any());
    }
}
