package com.printforge.printforge.marketplaceservice.controller;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.service.EstimateService;
import com.printforge.printforge.fileservice.storage.FileStorageService;
import com.printforge.printforge.marketplaceservice.dto.ReorderImagesRequest;
import com.printforge.printforge.marketplaceservice.exception.InvalidListingInputException;
import com.printforge.printforge.marketplaceservice.exception.ListingImageDeleteException;
import com.printforge.printforge.marketplaceservice.exception.ListingImageLimitExceededException;
import com.printforge.printforge.marketplaceservice.exception.ListingImageNotFoundException;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.model.ListingImage;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.marketplaceservice.repository.FavoriteRepository;
import com.printforge.printforge.marketplaceservice.repository.ListingImageRepository;
import com.printforge.printforge.moderationservice.service.ModerationLogService;
import com.printforge.printforge.paymentservice.repository.PaymentRepository;
import com.printforge.printforge.repository.UserRepository;
import com.printforge.printforge.settingsservice.service.SettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB — same direct-invocation
 * convention as MarketplaceControllerTest. Covers the multi-image gallery
 * additions: GET /{id}'s new "images" key (including the single-thumbnail
 * backward-compatibility case, the most important one — it must not break
 * any existing listing), and the new upload/delete/reorder endpoints.
 *
 * Run with: ./mvnw test -Dtest=ListingImageControllerTest
 */
class ListingImageControllerTest {

    DesignListingRepository listingRepository;
    EstimateService estimateService;
    FileStorageService fileStorageService;
    UserRepository userRepository;
    FavoriteRepository favoriteRepository;
    ModerationLogService moderationLogService;
    PaymentRepository paymentRepository;
    ListingImageRepository listingImageRepository;
    SettingsService settingsService;
    MarketplaceController controller;
    Authentication designerAuth;

    private static final Long DESIGNER_ID = 7L;
    private static final String DESIGNER_EMAIL = "designer@printforge.test";
    private static final Long LISTING_ID = 100L;

    @BeforeEach
    void setUp() {
        listingRepository = Mockito.mock(DesignListingRepository.class);
        estimateService = Mockito.mock(EstimateService.class);
        fileStorageService = Mockito.mock(FileStorageService.class);
        userRepository = Mockito.mock(UserRepository.class);
        favoriteRepository = Mockito.mock(FavoriteRepository.class);
        moderationLogService = Mockito.mock(ModerationLogService.class);
        paymentRepository = Mockito.mock(PaymentRepository.class);
        listingImageRepository = Mockito.mock(ListingImageRepository.class);
        settingsService = Mockito.mock(SettingsService.class);
        Mockito.lenient().when(settingsService.isFeatureEnabled(Mockito.anyString())).thenReturn(true);
        controller = new MarketplaceController(listingRepository, estimateService, fileStorageService,
                userRepository, favoriteRepository, moderationLogService, paymentRepository, listingImageRepository,
                settingsService);

        User designer = User.builder().userId(DESIGNER_ID).email(DESIGNER_EMAIL).role(Role.DESIGNER).build();
        Mockito.when(userRepository.findByEmail(DESIGNER_EMAIL)).thenReturn(Optional.of(designer));
        Mockito.when(listingRepository.save(Mockito.any(DesignListing.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        designerAuth = new UsernamePasswordAuthenticationToken(
                DESIGNER_EMAIL, null, Set.of(new SimpleGrantedAuthority("ROLE_DESIGNER")));
    }

    private DesignListing publishedListingOwnedByDesigner() {
        DesignListing listing = new DesignListing();
        listing.setId(LISTING_ID);
        listing.setDesignerId(DESIGNER_ID);
        listing.setStatus("PUBLISHED");
        listing.setThumbnailUrl("https://cdn.test/thumb.jpg");
        listing.setThumbnailFileId("thumb-public-id");
        return listing;
    }

    private ListingImage image(Long id, int order, String url) {
        ListingImage image = new ListingImage();
        image.setId(id);
        image.setListingId(LISTING_ID);
        image.setDisplayOrder(order);
        image.setImageUrl(url);
        return image;
    }

    // ── GET /{id}: "images" array shape ──────────────────────────────────────

    @Test
    void listingWithOnlyTheDefaultThumbnailReturnsASingleImageInTheArray() {
        DesignListing listing = publishedListingOwnedByDesigner();
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));
        ListingImage thumbnailImage = image(1L, 0, listing.getThumbnailUrl());
        Mockito.when(listingImageRepository.findByListingIdOrderByDisplayOrderAsc(LISTING_ID))
                .thenReturn(List.of(thumbnailImage));

        ResponseEntity<Map<String, Object>> response = controller.getListing(LISTING_ID, designerAuth);

        @SuppressWarnings("unchecked")
        List<ListingImage> images = (List<ListingImage>) response.getBody().get("images");
        assertEquals(1, images.size());
        assertEquals(listing.getThumbnailUrl(), images.get(0).getImageUrl());
        assertEquals(0, images.get(0).getDisplayOrder());
        // thumbnailUrl itself is untouched — old frontend code reading it
        // directly off "listing" keeps working unchanged.
        assertEquals("https://cdn.test/thumb.jpg",
                ((DesignListing) response.getBody().get("listing")).getThumbnailUrl());
    }

    @Test
    void listingWithNoImagesAtAllReturnsAnEmptyArrayNotAnError() {
        DesignListing listing = publishedListingOwnedByDesigner();
        listing.setThumbnailUrl(null);
        listing.setThumbnailFileId(null);
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));
        Mockito.when(listingImageRepository.findByListingIdOrderByDisplayOrderAsc(LISTING_ID))
                .thenReturn(List.of());

        ResponseEntity<Map<String, Object>> response = controller.getListing(LISTING_ID, designerAuth);

        @SuppressWarnings("unchecked")
        List<ListingImage> images = (List<ListingImage>) response.getBody().get("images");
        assertNotNull(images);
        assertTrue(images.isEmpty());
    }

    // ── POST /{id}/images ────────────────────────────────────────────────────

    @Test
    void uploadingAnAdditionalImageAppendsItAtTheNextDisplayOrder() {
        DesignListing listing = publishedListingOwnedByDesigner();
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));
        Mockito.when(listingImageRepository.countByListingId(LISTING_ID)).thenReturn(1L);
        Mockito.when(fileStorageService.storeImage(Mockito.any()))
                .thenReturn(new FileStorageService.CloudinaryImageResult(
                        "https://cdn.test/extra.jpg", "extra-public-id"));
        Mockito.when(listingImageRepository.save(Mockito.any(ListingImage.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        MockMultipartFile file = new MockMultipartFile("image", "part.jpg", "image/jpeg", new byte[]{1, 2, 3});
        ResponseEntity<ListingImage> response = controller.addListingImage(
                LISTING_ID, file, "Printed parts before assembly", designerAuth);

        ListingImage saved = response.getBody();
        assertEquals("https://cdn.test/extra.jpg", saved.getImageUrl());
        assertEquals("extra-public-id", saved.getImageFileId());
        assertEquals(1, saved.getDisplayOrder());
        assertEquals("Printed parts before assembly", saved.getCaption());
        // Not the first image for this listing, so the existing thumbnail
        // is left exactly as it was.
        assertEquals("https://cdn.test/thumb.jpg", listing.getThumbnailUrl());
    }

    @Test
    void firstImageOnAListingCreatedWithNoThumbnailBecomesTheThumbnail() {
        DesignListing listing = publishedListingOwnedByDesigner();
        listing.setThumbnailUrl(null);
        listing.setThumbnailFileId(null);
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));
        Mockito.when(listingImageRepository.countByListingId(LISTING_ID)).thenReturn(0L);
        Mockito.when(fileStorageService.storeImage(Mockito.any()))
                .thenReturn(new FileStorageService.CloudinaryImageResult(
                        "https://cdn.test/first.jpg", "first-public-id"));
        Mockito.when(listingImageRepository.save(Mockito.any(ListingImage.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        MockMultipartFile file = new MockMultipartFile("image", "part.jpg", "image/jpeg", new byte[]{1});
        controller.addListingImage(LISTING_ID, file, null, designerAuth);

        assertEquals("https://cdn.test/first.jpg", listing.getThumbnailUrl());
        assertEquals("first-public-id", listing.getThumbnailFileId());
    }

    @Test
    void uploadingBeyondTheCapIsRejected() {
        DesignListing listing = publishedListingOwnedByDesigner();
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));
        Mockito.when(listingImageRepository.countByListingId(LISTING_ID)).thenReturn(8L);

        MockMultipartFile file = new MockMultipartFile("image", "part.jpg", "image/jpeg", new byte[]{1});
        assertThrows(ListingImageLimitExceededException.class,
                () -> controller.addListingImage(LISTING_ID, file, null, designerAuth));
        Mockito.verifyNoInteractions(fileStorageService);
    }

    @Test
    void aNonOwnerCannotUploadAnImage() {
        DesignListing listing = publishedListingOwnedByDesigner();
        listing.setDesignerId(999L);
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));

        MockMultipartFile file = new MockMultipartFile("image", "part.jpg", "image/jpeg", new byte[]{1});
        assertThrows(AccessDeniedException.class,
                () -> controller.addListingImage(LISTING_ID, file, null, designerAuth));
    }

    // ── DELETE /{id}/images/{imageId} ───────────────────────────────────────

    @Test
    void deletingOneImageCompactsTheRemainingDisplayOrderAndKeepsItContiguous() {
        DesignListing listing = publishedListingOwnedByDesigner();
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));

        ListingImage img0 = image(1L, 0, "https://cdn.test/0.jpg");
        ListingImage img1 = image(2L, 1, "https://cdn.test/1.jpg");
        ListingImage img2 = image(3L, 2, "https://cdn.test/2.jpg");
        Mockito.when(listingImageRepository.findByIdAndListingId(2L, LISTING_ID)).thenReturn(Optional.of(img1));
        Mockito.when(listingImageRepository.findByListingIdOrderByDisplayOrderAsc(LISTING_ID))
                .thenReturn(new ArrayList<>(List.of(img0, img1, img2)));
        Mockito.when(listingImageRepository.saveAll(Mockito.anyList()))
                .thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<Void> response = controller.deleteListingImage(LISTING_ID, 2L, designerAuth);

        assertEquals(204, response.getStatusCode().value());
        Mockito.verify(listingImageRepository).delete(img1);
        // img1 (displayOrder 1) is gone; img2 shifts down to fill the gap —
        // no hole left at displayOrder 1.
        assertEquals(0, img0.getDisplayOrder());
        assertEquals(1, img2.getDisplayOrder());
        // img0 was already at position 0 and stays the thumbnail.
        assertEquals("https://cdn.test/0.jpg", listing.getThumbnailUrl());
    }

    @Test
    void deletingTheDisplayOrderZeroImageReDerivesTheThumbnailFromTheNewFirst() {
        DesignListing listing = publishedListingOwnedByDesigner();
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));

        ListingImage img0 = image(1L, 0, "https://cdn.test/0.jpg");
        img0.setImageFileId("public-0");
        ListingImage img1 = image(2L, 1, "https://cdn.test/1.jpg");
        img1.setImageFileId("public-1");
        Mockito.when(listingImageRepository.findByIdAndListingId(1L, LISTING_ID)).thenReturn(Optional.of(img0));
        Mockito.when(listingImageRepository.findByListingIdOrderByDisplayOrderAsc(LISTING_ID))
                .thenReturn(new ArrayList<>(List.of(img0, img1)));
        Mockito.when(listingImageRepository.saveAll(Mockito.anyList()))
                .thenAnswer(inv -> inv.getArgument(0));

        controller.deleteListingImage(LISTING_ID, 1L, designerAuth);

        assertEquals(0, img1.getDisplayOrder());
        assertEquals("https://cdn.test/1.jpg", listing.getThumbnailUrl());
        assertEquals("public-1", listing.getThumbnailFileId());
    }

    @Test
    void deletingTheLastRemainingImageIsRejected() {
        DesignListing listing = publishedListingOwnedByDesigner();
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));

        ListingImage onlyImage = image(1L, 0, listing.getThumbnailUrl());
        Mockito.when(listingImageRepository.findByIdAndListingId(1L, LISTING_ID)).thenReturn(Optional.of(onlyImage));
        Mockito.when(listingImageRepository.findByListingIdOrderByDisplayOrderAsc(LISTING_ID))
                .thenReturn(List.of(onlyImage));

        assertThrows(ListingImageDeleteException.class,
                () -> controller.deleteListingImage(LISTING_ID, 1L, designerAuth));
        Mockito.verify(listingImageRepository, Mockito.never()).delete(Mockito.any());
    }

    @Test
    void deletingAnImageThatDoesNotBelongToTheListingIs404() {
        DesignListing listing = publishedListingOwnedByDesigner();
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));
        Mockito.when(listingImageRepository.findByIdAndListingId(999L, LISTING_ID)).thenReturn(Optional.empty());

        assertThrows(ListingImageNotFoundException.class,
                () -> controller.deleteListingImage(LISTING_ID, 999L, designerAuth));
    }

    // ── PATCH /{id}/images/reorder ───────────────────────────────────────────

    @Test
    void reorderingUpdatesDisplayOrderAndPromotesTheNewFirstImageToThumbnail() {
        DesignListing listing = publishedListingOwnedByDesigner();
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));

        ListingImage img0 = image(1L, 0, "https://cdn.test/0.jpg");
        ListingImage img1 = image(2L, 1, "https://cdn.test/1.jpg");
        ListingImage img2 = image(3L, 2, "https://cdn.test/2.jpg");
        Mockito.when(listingImageRepository.findByListingIdOrderByDisplayOrderAsc(LISTING_ID))
                .thenReturn(new ArrayList<>(List.of(img0, img1, img2)));
        Mockito.when(listingImageRepository.saveAll(Mockito.anyList()))
                .thenAnswer(inv -> inv.getArgument(0));

        ReorderImagesRequest request = new ReorderImagesRequest();
        request.setImageIds(List.of(3L, 1L, 2L));

        ResponseEntity<List<ListingImage>> response = controller.reorderImages(LISTING_ID, request, designerAuth);

        List<ListingImage> body = response.getBody();
        assertEquals(3L, body.get(0).getId());
        assertEquals(1L, body.get(1).getId());
        assertEquals(2L, body.get(2).getId());
        assertEquals(0, img2.getDisplayOrder());
        assertEquals(1, img0.getDisplayOrder());
        assertEquals(2, img1.getDisplayOrder());
        assertEquals("https://cdn.test/2.jpg", listing.getThumbnailUrl());
    }

    @Test
    void reorderingWithAMismatchedIdSetIsRejected() {
        DesignListing listing = publishedListingOwnedByDesigner();
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));

        ListingImage img0 = image(1L, 0, "https://cdn.test/0.jpg");
        ListingImage img1 = image(2L, 1, "https://cdn.test/1.jpg");
        Mockito.when(listingImageRepository.findByListingIdOrderByDisplayOrderAsc(LISTING_ID))
                .thenReturn(List.of(img0, img1));

        ReorderImagesRequest request = new ReorderImagesRequest();
        request.setImageIds(List.of(1L, 999L));

        assertThrows(InvalidListingInputException.class,
                () -> controller.reorderImages(LISTING_ID, request, designerAuth));
    }

    @Test
    void reorderingWithADuplicateIdIsRejected() {
        DesignListing listing = publishedListingOwnedByDesigner();
        Mockito.when(listingRepository.findById(LISTING_ID)).thenReturn(Optional.of(listing));

        ListingImage img0 = image(1L, 0, "https://cdn.test/0.jpg");
        ListingImage img1 = image(2L, 1, "https://cdn.test/1.jpg");
        Mockito.when(listingImageRepository.findByListingIdOrderByDisplayOrderAsc(LISTING_ID))
                .thenReturn(List.of(img0, img1));

        ReorderImagesRequest request = new ReorderImagesRequest();
        request.setImageIds(List.of(1L, 1L));

        assertThrows(InvalidListingInputException.class,
                () -> controller.reorderImages(LISTING_ID, request, designerAuth));
    }
}
