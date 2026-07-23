package com.printforge.admin.adminservice.service;

import com.printforge.admin.adminservice.dto.RevenueHistoryEntry;
import com.printforge.admin.dto.UserDto;
import com.printforge.admin.entity.User;
import com.printforge.admin.marketplaceservice.exception.InvalidListingInputException;
import com.printforge.admin.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.admin.marketplaceservice.model.DesignListing;
import com.printforge.admin.marketplaceservice.repository.DesignListingRepository;
import com.printforge.admin.moderationservice.model.ModerationActionType;
import com.printforge.admin.moderationservice.model.ModerationTargetType;
import com.printforge.admin.moderationservice.service.ModerationLogService;
import com.printforge.admin.notificationservice.service.NotificationService;
import com.printforge.admin.paymentservice.model.Payment;
import com.printforge.admin.paymentservice.repository.PaymentRepository;
import com.printforge.admin.printerservice.model.Printer;
import com.printforge.admin.printerservice.repository.PrinterRepository;
import com.printforge.admin.queueservice.repository.PrintJobRepository;
import com.printforge.admin.repository.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
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
    private final PaymentRepository paymentRepository;

    public AdminService(PrintJobRepository printJobRepository,
                        PrinterRepository printerRepository,
                        DesignListingRepository designListingRepository,
                        UserRepository userRepository,
                        NotificationService notificationService,
                        ModerationLogService moderationLogService,
                        PaymentRepository paymentRepository) {
        this.printJobRepository = printJobRepository;
        this.printerRepository = printerRepository;
        this.designListingRepository = designListingRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.moderationLogService = moderationLogService;
        this.paymentRepository = paymentRepository;
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

        // Designer earnings summary: how much each designer is owed.
        // Batched via findAllById() — same pattern as
        // MarketplaceController.enrichWithDesigner(List) — instead of one
        // findById() per row, which was N+1 for N distinct designers.
        List<Object[]> rawEarnings = designListingRepository.sumEarningsByDesigner();
        List<Long> designerIds = rawEarnings.stream()
                .map(row -> ((Number) row[0]).longValue())
                .distinct()
                .toList();
        Map<Long, User> designersById = userRepository.findAllById(designerIds).stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));
        List<Map<String, Object>> designerEarnings = rawEarnings.stream().map(row -> {
            Long designerId = ((Number) row[0]).longValue();
            Object totalOwed = row[1];
            Map<String, Object> entry = new LinkedHashMap<>();
            User designer = designersById.get(designerId);
            String designerName = designer != null ? designer.getFullName() : "Designer #" + designerId;
            entry.put("designer_name", designerName);
            entry.put("total_owed", totalOwed);
            return entry;
        }).toList();

        List<Object[]> materialUsageRows = printJobRepository.countGroupedByMaterial();
        Map<String, Long> materialUsage = new LinkedHashMap<>();
        for (Object[] row : materialUsageRows) {
            materialUsage.put((String) row[0], ((Number) row[1]).longValue());
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalJobs", totalJobs);
        summary.put("jobsByStatus", jobsByStatus);
        summary.put("totalPrinters", (long) allPrinters.size());
        summary.put("printersByStatus", printersByStatus);
        summary.put("designer_earnings", designerEarnings);
        summary.put("materialUsage", materialUsage);
        return summary;
    }

    private static final int MAX_REVENUE_HISTORY_DAYS = 90;

    /**
     * GET /api/admin/dashboard/revenue-history — completed-payment revenue,
     * bucketed by calendar day using Payment.completedAt (when the payment
     * actually cleared), not initiatedAt. Always returns exactly `days`
     * entries in ascending date order ending today, including days with
     * zero revenue — the dashboard chart needs a continuous series, not a
     * sparse one it has to fill in itself. days is clamped to
     * [1, MAX_REVENUE_HISTORY_DAYS] so an unbounded or non-positive value
     * from the client can't force scanning an unreasonably large row set.
     */
    public List<RevenueHistoryEntry> getRevenueHistory(int days) {
        int clampedDays = Math.max(1, Math.min(days, MAX_REVENUE_HISTORY_DAYS));

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(clampedDays - 1L);

        List<Payment> completedPayments = paymentRepository.findByStatusAndCompletedAtGreaterThanEqual(
                "COMPLETED", startDate.atStartOfDay());

        Map<LocalDate, BigDecimal> revenueByDay = new HashMap<>();
        for (Payment payment : completedPayments) {
            if (payment.getCompletedAt() == null) continue;
            LocalDate day = payment.getCompletedAt().toLocalDate();
            BigDecimal amount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
            revenueByDay.merge(day, amount, BigDecimal::add);
        }

        List<RevenueHistoryEntry> series = new ArrayList<>();
        for (LocalDate day = startDate; !day.isAfter(endDate); day = day.plusDays(1)) {
            series.add(new RevenueHistoryEntry(day.toString(), revenueByDay.getOrDefault(day, BigDecimal.ZERO)));
        }
        return series;
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

    /**
     * Hard-deletes a user and all of their related data across the platform.
     * Uses JdbcTemplate to bypass microservice boundaries since they share printforge_db.
     */
    @org.springframework.transaction.annotation.Transactional
    public void deleteUserCascade(Long id, User actor) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + id));

        if (user.getRole().name().equals("ADMIN") || user.getRole().name().equals("LAB_STAFF")) {
            throw new IllegalArgumentException("Cannot delete administrative users.");
        }

        // We bypass JPA and microservice silos because everything lives in printforge_db.
        // It's the most robust way to ensure no FK constraint violations across domains.
        org.springframework.jdbc.core.JdbcTemplate jdbc = new org.springframework.jdbc.core.JdbcTemplate(
                org.springframework.web.context.support.WebApplicationContextUtils.getWebApplicationContext(
                        ((org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.getRequestAttributes()).getRequest().getServletContext()
                ).getBean(javax.sql.DataSource.class)
        );

        // Delete dependencies (order matters to avoid FK constraints if they exist)
        jdbc.update("DELETE FROM reports WHERE reporter_id = ?", id);
        jdbc.update("DELETE FROM reports WHERE target_type = 'USER' AND target_id = ?", id);
        jdbc.update("DELETE FROM notifications WHERE user_id = ?", id);
        jdbc.update("DELETE FROM print_jobs WHERE user_id = ?", id);
        jdbc.update("DELETE FROM design_listings WHERE designer_id = ?", id);
        jdbc.update("DELETE FROM moderation_logs WHERE actor_id = ?", id);
        jdbc.update("DELETE FROM moderation_logs WHERE target_type = 'USER' AND target_id = ?", id);
        
        // Finally, delete the user
        userRepository.deleteById(id);
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteJob(Long id) {
        if (!printJobRepository.existsById(id)) {
            throw new IllegalArgumentException("Job not found: " + id);
        }
        
        // Bypassing microservice silos just in case there are notifications pointing to it.
        // There's no specific Job notification FK constraint since notification target is loose,
        // but let's be safe. Delete the job directly.
        printJobRepository.deleteById(id);
    }
}
