package com.printforge.printforge;

import com.printforge.printforge.adminservice.controller.AdminController;
import com.printforge.printforge.adminservice.dto.SuspendUserRequest;
import com.printforge.printforge.adminservice.service.AdminService;
import com.printforge.printforge.controller.PrintJobController;
import com.printforge.printforge.dto.UpdateJobRequest;
import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.service.EstimateService;
import com.printforge.printforge.fileservice.storage.FileStorageService;
import com.printforge.printforge.marketplaceservice.controller.MarketplaceController;
import com.printforge.printforge.marketplaceservice.exception.InvalidListingInputException;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.marketplaceservice.repository.FavoriteRepository;
import com.printforge.printforge.moderationservice.service.ModerationLogService;
import com.printforge.printforge.notificationservice.controller.NotificationController;
import com.printforge.printforge.paymentservice.repository.PaymentRepository;
import com.printforge.printforge.notificationservice.exception.InvalidNotificationInputException;
import com.printforge.printforge.notificationservice.service.NotificationService;
import com.printforge.printforge.repository.UserRepository;
import com.printforge.printforge.service.AuthService;
import com.printforge.printforge.service.PrintJobService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * #71 — proves each of the four length caps is actually reachable, not just
 * present as an annotation/helper that's never wired in.
 *
 * UpdateJobRequest.notes and SuspendUserRequest.reason are Jakarta @Size
 * fields, enforced by Spring MVC's @Valid argument-resolution step (throws
 * MethodArgumentNotValidException -> GlobalExceptionHandler -> 400) — that
 * generic pipeline is already proven in production by ForgotPasswordRequest/
 * ResetPasswordRequest, so what actually needs proving here is narrower:
 * that @Size on these two specific fields really produces a
 * ConstraintViolation. Checked directly against jakarta.validation's
 * Validator, the same engine @Valid delegates to.
 *
 * DesignListing.description and Notification.message are manual checks
 * (validateDescription()/the inline length guard), not annotation-driven —
 * for those, calling the controller method directly (same direct-invocation
 * style as FileControllerTest, this codebase's existing controller-test
 * convention) exercises the real code path and its real exception type,
 * which GlobalExceptionHandler already maps to 400 for
 * InvalidListingInputException/InvalidNotificationInputException.
 *
 * Run with: ./mvnw test -Dtest=UnboundedTextFieldValidationTest
 */
class UnboundedTextFieldValidationTest {

    private static final Validator VALIDATOR =
            Validation.buildDefaultValidatorFactory().getValidator();

    // ── PrintJob.notes / UpdateJobRequest ──────────────────────────────────

    @Test
    void updateJobRequestRejectsNotesOver500Chars() {
        UpdateJobRequest request = new UpdateJobRequest();
        request.setNotes("x".repeat(501));

        Set<ConstraintViolation<UpdateJobRequest>> violations = VALIDATOR.validate(request);

        assertEquals(1, violations.size());
        assertEquals("notes", violations.iterator().next().getPropertyPath().toString());
    }

    @Test
    void updateJobRequestAcceptsNotesAt500Chars() {
        UpdateJobRequest request = new UpdateJobRequest();
        request.setNotes("x".repeat(500));

        assertTrue(VALIDATOR.validate(request).isEmpty());
    }

    @Test
    void updateJobRequestAcceptsNullOrBlankNotes() {
        UpdateJobRequest request = new UpdateJobRequest();
        request.setNotes(null);
        assertTrue(VALIDATOR.validate(request).isEmpty(), "notes is optional — null must not violate @Size");

        request.setNotes("");
        assertTrue(VALIDATOR.validate(request).isEmpty(), "notes is optional — blank must not violate @Size");
    }

    // ── SuspendUserRequest.reason ───────────────────────────────────────────

    @Test
    void suspendUserRequestRejectsReasonOver500Chars() {
        SuspendUserRequest request = new SuspendUserRequest();
        request.setReason("x".repeat(501));

        Set<ConstraintViolation<SuspendUserRequest>> violations = VALIDATOR.validate(request);

        assertEquals(1, violations.size());
        assertEquals("reason", violations.iterator().next().getPropertyPath().toString());
    }

    @Test
    void suspendUserRequestAcceptsNullReason() {
        SuspendUserRequest request = new SuspendUserRequest();
        request.setReason(null);
        assertTrue(VALIDATOR.validate(request).isEmpty(),
                "reason stays optional by design (#71) — @NotBlank deliberately not added");
    }

    // ── @Valid is actually wired at the controller parameter ──────────────
    // (confirms the annotation isn't just sitting on the DTO unused)

    @Test
    void printJobControllerUpdateEndpointRequiresValidAnnotation() throws NoSuchMethodException {
        var method = PrintJobController.class.getMethod(
                "updatePrintJob", Long.class, UpdateJobRequest.class, Authentication.class);
        boolean hasValid = java.util.Arrays.stream(method.getParameterAnnotations()[1])
                .anyMatch(a -> a.annotationType() == jakarta.validation.Valid.class);
        assertTrue(hasValid, "@Valid must be present on UpdateJobRequest parameter for @Size to be enforced");
    }

    @Test
    void adminControllerSuspendEndpointRequiresValidAnnotation() throws NoSuchMethodException {
        var method = AdminController.class.getMethod(
                "suspendUser", Long.class, SuspendUserRequest.class, Authentication.class);
        boolean hasValid = java.util.Arrays.stream(method.getParameterAnnotations()[1])
                .anyMatch(a -> a.annotationType() == jakarta.validation.Valid.class);
        assertTrue(hasValid, "@Valid must be present on SuspendUserRequest parameter for @Size to be enforced");
    }

    // ── Notification.message (manual check in the controller) ─────────────

    private NotificationService notificationService;
    private UserRepository userRepository;
    private NotificationController notificationController;

    @BeforeEach
    void setUpNotificationController() {
        notificationService = Mockito.mock(NotificationService.class);
        userRepository = Mockito.mock(UserRepository.class);
        notificationController = new NotificationController(notificationService, userRepository);
    }

    @Test
    void notificationControllerRejectsMessageOver500Chars() {
        String oversized = "x".repeat(501);

        InvalidNotificationInputException ex = assertThrows(InvalidNotificationInputException.class,
                () -> notificationController.createNotification(1L, "Title", oversized, "info"));

        assertTrue(ex.getMessage().contains("500"));
        Mockito.verifyNoInteractions(notificationService);
    }

    @Test
    void notificationControllerRejectsBlankMessage() {
        assertThrows(InvalidNotificationInputException.class,
                () -> notificationController.createNotification(1L, "Title", "  ", "info"));
    }

    @Test
    void notificationControllerAcceptsMessageAt500Chars() {
        String maxLength = "x".repeat(500);
        Mockito.when(notificationService.createNotification(1L, "Title", maxLength, "info"))
                .thenReturn(null);

        assertDoesNotThrow(() -> notificationController.createNotification(1L, "Title", maxLength, "info"));
        Mockito.verify(notificationService).createNotification(1L, "Title", maxLength, "info");
    }

    // ── DesignListing.description (manual check in MarketplaceController) ──

    private DesignListingRepository listingRepository;
    private EstimateService estimateService;
    private FileStorageService fileStorageService;
    private FavoriteRepository favoriteRepository;
    private ModerationLogService moderationLogService;
    private PaymentRepository paymentRepository;
    private MarketplaceController marketplaceController;
    private Authentication designerAuth;

    @BeforeEach
    void setUpMarketplaceController() {
        listingRepository = Mockito.mock(DesignListingRepository.class);
        estimateService = Mockito.mock(EstimateService.class);
        fileStorageService = Mockito.mock(FileStorageService.class);
        userRepository = Mockito.mock(UserRepository.class);
        favoriteRepository = Mockito.mock(FavoriteRepository.class);
        moderationLogService = Mockito.mock(ModerationLogService.class);
        paymentRepository = Mockito.mock(PaymentRepository.class);
        marketplaceController = new MarketplaceController(
                listingRepository, estimateService, fileStorageService,
                userRepository, favoriteRepository, moderationLogService, paymentRepository);

        User designer = User.builder()
                .userId(42L)
                .fullName("Test Designer")
                .email("designer@printforge.test")
                .role(Role.DESIGNER)
                .build();
        Mockito.when(userRepository.findByEmail("designer@printforge.test")).thenReturn(Optional.of(designer));
        designerAuth = new UsernamePasswordAuthenticationToken(
                "designer@printforge.test", null, Set.of(new SimpleGrantedAuthority("ROLE_DESIGNER")));
    }

    @Test
    void createListingRejectsDescriptionOver2000Chars() {
        String oversized = "x".repeat(2001);

        InvalidListingInputException ex = assertThrows(InvalidListingInputException.class,
                () -> marketplaceController.createListing(
                        1L, "Title", oversized, java.math.BigDecimal.TEN,
                        null, null, true, null, null, null, null, null, designerAuth));

        assertTrue(ex.getMessage().contains("2000"));
        Mockito.verifyNoInteractions(listingRepository);
    }

    @Test
    void createListingAcceptsDescriptionAt2000Chars() {
        String maxLength = "x".repeat(2000);
        Mockito.when(listingRepository.save(Mockito.any())).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> marketplaceController.createListing(
                1L, "Title", maxLength, java.math.BigDecimal.TEN,
                null, null, true, null, null, null, null, null, designerAuth));
    }

    @Test
    void updateListingRejectsDescriptionOver2000Chars() {
        DesignListing existing = new DesignListing();
        existing.setId(7L);
        existing.setDesignerId(42L);
        Mockito.when(listingRepository.findById(7L)).thenReturn(Optional.of(existing));

        String oversized = "x".repeat(2001);
        InvalidListingInputException ex = assertThrows(InvalidListingInputException.class,
                () -> marketplaceController.updateListing(
                        7L, java.util.Map.of("description", oversized), designerAuth));

        assertTrue(ex.getMessage().contains("2000"));
        Mockito.verify(listingRepository, Mockito.never()).save(Mockito.any());
    }
}
