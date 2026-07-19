package com.printforge.printforge.adminservice.service;

import com.printforge.printforge.dto.UserDto;
import com.printforge.printforge.entity.User;
import com.printforge.printforge.marketplaceservice.exception.InvalidListingInputException;
import com.printforge.printforge.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.moderationservice.model.ModerationActionType;
import com.printforge.printforge.moderationservice.model.ModerationTargetType;
import com.printforge.printforge.moderationservice.service.ModerationLogService;
import com.printforge.printforge.notificationservice.service.NotificationService;
import com.printforge.printforge.printerservice.model.Printer;
import com.printforge.printforge.printerservice.repository.PrinterRepository;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import com.printforge.printforge.repository.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final PrintJobRepository printJobRepository;
    private final PrinterRepository printerRepository;
    private final DesignListingRepository designListingRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ModerationLogService moderationLogService;

    public AdminService(PrintJobRepository printJobRepository,
                        PrinterRepository printerRepository,
                        DesignListingRepository designListingRepository,
                        UserRepository userRepository,
                        NotificationService notificationService,
                        ModerationLogService moderationLogService) {
        this.printJobRepository = printJobRepository;
        this.printerRepository = printerRepository;
        this.designListingRepository = designListingRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.moderationLogService = moderationLogService;
    }

    public Map<String, Object> getDashboardSummary() {
        // Count jobs by status directly in the DB — no full table load into memory
        List<Object[]> jobStatusRows = printJobRepository.countGroupedByStatus();
        Map<String, Long> jobsByStatus = new LinkedHashMap<>();
        for (Object[] row : jobStatusRows) {
            jobsByStatus.put((String) row[0], ((Number) row[1]).longValue());
        }
        long totalJobs = printJobRepository.countAllJobs();

        List<Printer> allPrinters = printerRepository.findAll();
        Map<String, Long> printersByStatus = allPrinters.stream()
                .collect(Collectors.groupingBy(Printer::getStatus, Collectors.counting()));

        // Designer earnings summary: how much each designer is owed
        List<Object[]> rawEarnings = designListingRepository.sumEarningsByDesigner();
        List<Map<String, Object>> designerEarnings = rawEarnings.stream().map(row -> {
            Long designerId = ((Number) row[0]).longValue();
            Object totalOwed = row[1];
            Map<String, Object> entry = new LinkedHashMap<>();
            String designerName = userRepository.findById(designerId)
                    .map(u -> u.getFullName())
                    .orElse("Designer #" + designerId);
            entry.put("designer_name", designerName);
            entry.put("total_owed", totalOwed);
            return entry;
        }).toList();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalJobs", totalJobs);
        summary.put("jobsByStatus", jobsByStatus);
        summary.put("totalPrinters", (long) allPrinters.size());
        summary.put("printersByStatus", printersByStatus);
        summary.put("designer_earnings", designerEarnings);
        return summary;
    }

    /**
     * PATCH /api/admin/listings/{id}/unpublish — force-unpublish any
     * listing regardless of owner (#67/#68 takedown). Separate from
     * MarketplaceController's designer-only publish/unpublish, which stays
     * untouched: this sets adminUnpublished=true (+ adminUnpublishedAt =
     * now(), recording when) in addition to flipping status back to DRAFT,
     * so the marketplace-visibility queries (MarketplaceController.
     * excludeModerated/isOwnerSuspended, UserService.
     * getPublishedDesignsForUser) keep it hidden even if the designer
     * calls their own unmodified /publish endpoint afterward.
     *
     * actor is the calling admin (resolved in AdminController via
     * Authentication) — logged to ModerationLogService once the save
     * succeeds, per #66's pulled-forward audit-trail slice.
     */
    public DesignListing unpublishListing(Long id, User actor) {
        DesignListing listing = designListingRepository.findById(id)
                .orElseThrow(() -> new ListingNotFoundException(id));
        listing.setStatus("DRAFT");
        listing.setPublishedAt(null);
        listing.setAdminUnpublished(true);
        listing.setAdminUnpublishedAt(LocalDateTime.now());
        DesignListing saved = designListingRepository.save(listing);
        moderationLogService.log(actor, ModerationActionType.ADMIN_UNPUBLISH,
                ModerationTargetType.LISTING, id, null);
        return saved;
    }

    /**
     * PATCH /api/admin/listings/{id}/republish — undoes unpublishListing()
     * above: clears adminUnpublished/adminUnpublishedAt and restores
     * status/publishedAt, the exact mirror of what unpublish set. Gated on
     * adminUnpublished currently being true — that flag is the only thing
     * this method (or unpublishListing) ever writes, and nothing else in
     * the codebase writes to it (MarketplaceController's designer-only
     * publish/unpublish only ever touch status/publishedAt), so
     * "adminUnpublished == true" unambiguously means "there is an active
     * admin takedown on this listing to undo." Rejects otherwise rather
     * than silently republishing a listing that's DRAFT purely because
     * the designer chose that.
     *
     * KNOWN LIMITATION, STILL NOT RESOLVED by adminUnpublishedAt — flagged
     * rather than silently guessed at, see Handoff.md for the full
     * writeup. adminUnpublishedAt records *when the admin* took this
     * listing down, but resolving the ambiguity this method has always had
     * (a designer independently publish-then-unpublishing again after an
     * admin takedown, landing back on the identical status=DRAFT +
     * adminUnpublished=true state this method can't tell apart from
     * "untouched since the admin's takedown") requires comparing that
     * against *when the designer last touched this listing* — and
     * DesignListing has no such field. publishedAt gets nulled out by
     * every unpublish, admin's or the designer's own, so it can't record
     * a designer-unpublish timestamp either. Adding that second field
     * wasn't done speculatively; it needs its own explicit ask.
     */
    public DesignListing republishListing(Long id, User actor) {
        DesignListing listing = designListingRepository.findById(id)
                .orElseThrow(() -> new ListingNotFoundException(id));

        if (!Boolean.TRUE.equals(listing.getAdminUnpublished())) {
            throw new InvalidListingInputException(
                    "This listing was not force-unpublished by an admin; there is nothing to republish.");
        }

        listing.setAdminUnpublished(false);
        listing.setAdminUnpublishedAt(null);
        listing.setStatus("PUBLISHED");
        listing.setPublishedAt(LocalDateTime.now());
        DesignListing saved = designListingRepository.save(listing);
        moderationLogService.log(actor, ModerationActionType.ADMIN_REPUBLISH,
                ModerationTargetType.LISTING, id, null);
        return saved;
    }

    /**
     * PATCH /api/admin/users/{id}/suspend — sets/clears User.suspended
     * (#68). JwtAuthFilter checks this flag on every subsequent request
     * with an already-issued token; this method just persists the flag and
     * notifies the affected user (reason folded into the notification
     * text, not persisted — same pattern as PrintJobFacadeController's
     * rejectJob reason). Returns UserDto rather than the raw User entity
     * so the password hash never serializes into the response.
     *
     * actor is the calling admin, logged to ModerationLogService once the
     * suspend/unsuspend actually persists — metadata records which of the
     * two this was (a single ADMIN_SUSPEND_USER action type covers both,
     * per the task's enum list) plus the reason, if one was given.
     */
    public UserDto suspendUser(Long id, boolean suspended, String reason, User actor) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + id));

        user.setSuspended(suspended);
        User saved = userRepository.save(user);

        notificationService.createNotification(
                saved.getUserId(),
                suspended ? "Account Suspended" : "Account Reactivated",
                suspended
                        ? "Your account has been suspended."
                                + (reason != null && !reason.isBlank() ? " Reason: " + reason : "")
                        : "Your account access has been restored.",
                suspended ? "error" : "success"
        );

        moderationLogService.log(actor, ModerationActionType.ADMIN_SUSPEND_USER,
                ModerationTargetType.USER, id,
                (suspended ? "Suspended" : "Unsuspended")
                        + (reason != null && !reason.isBlank() ? ": " + reason : ""));

        return UserDto.builder()
                .user_id(saved.getUserId())
                .full_name(saved.getFullName())
                .email(saved.getEmail())
                .role(saved.getRole().name().toLowerCase())
                .profile_picture_url(saved.getProfilePictureUrl())
                .suspended(saved.getSuspended())
                .build();
    }
}
