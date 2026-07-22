package com.printforge.order.facade;

import com.printforge.order.entity.User;
import com.printforge.order.estimateservice.model.Estimate;
import com.printforge.order.estimateservice.repository.EstimateRepository;
import com.printforge.order.estimateservice.service.EstimateService;
import com.printforge.order.facade.dto.OrderAwaitingPaymentResponse;
import com.printforge.order.facade.dto.PrintJobResponse;
import com.printforge.order.fileservice.model.ModelFile;
import com.printforge.order.fileservice.service.FileService;
import com.printforge.order.labservice.dto.LabLocationSummary;
import com.printforge.order.labservice.model.LabLocation;
import com.printforge.order.labservice.service.LabLocationService;
import com.printforge.order.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.order.marketplaceservice.exception.ListingNotPublishedException;
import com.printforge.order.marketplaceservice.model.DesignListing;
import com.printforge.order.marketplaceservice.repository.DesignListingRepository;
import com.printforge.order.notificationservice.model.NotificationType;
import com.printforge.order.notificationservice.service.NotificationService;
import com.printforge.order.queueservice.model.PrintJob;
import com.printforge.order.queueservice.repository.PrintJobRepository;
import com.printforge.order.queueservice.service.PrintQueueService;
import com.printforge.order.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Bridges the frontend's 1-step job submission flow to the backend's
 * multi-service architecture.
 *
 * POST /api/print-jobs         → marketplace order (JSON: listing_id + print params).
 *                                 Creates/reuses an Estimate only — no PrintJob yet.
 *                                 PaymentService.handleWebhook creates the PrintJob
 *                                 once payment clears (see #58).
 * POST /api/print-jobs/upload  → bring-your-own-file (multipart, backward compat).
 *                                 Same payment-gated behavior as above.
 * GET  /api/print-jobs         → list jobs
 * GET  /api/print-jobs/:id     → single job
 * PATCH /api/print-jobs/:id/approve
 * PATCH /api/print-jobs/:id/reject
 */
@RestController
@RequestMapping("/api/print-jobs")
public class PrintJobFacadeController {

    private final FileService fileService;
    private final EstimateService estimateService;
    private final PrintQueueService printQueueService;
    private final PrintJobRepository printJobRepository;
    private final EstimateRepository estimateRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final DesignListingRepository designListingRepository;
    private final LabLocationService labLocationService;

    public PrintJobFacadeController(
            FileService fileService,
            EstimateService estimateService,
            PrintQueueService printQueueService,
            PrintJobRepository printJobRepository,
            EstimateRepository estimateRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            DesignListingRepository designListingRepository,
            LabLocationService labLocationService) {
        this.fileService = fileService;
        this.estimateService = estimateService;
        this.printQueueService = printQueueService;
        this.printJobRepository = printJobRepository;
        this.estimateRepository = estimateRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.designListingRepository = designListingRepository;
        this.labLocationService = labLocationService;
    }

    // ── Marketplace Order (JSON body with listing_id) ─────────────────────────

    @PostMapping(consumes = "application/json")
    public ResponseEntity<OrderAwaitingPaymentResponse> submitMarketplaceOrder(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {

        User caller = currentUser(authentication);

        // 1. Look up the listing
        Long listingId = ((Number) body.get("listing_id")).longValue();
        DesignListing listing = designListingRepository.findById(listingId)
                .orElseThrow(() -> new ListingNotFoundException(listingId));
        if (!"PUBLISHED".equals(listing.getStatus())) {
            throw new ListingNotPublishedException(listingId);
        }

        // 2. Get file from listing
        Long fileId = listing.getFileId();

        // 3. Parse print params
        String material = body.getOrDefault("material", "PLA").toString();
        int quantity = body.containsKey("quantity") ? ((Number) body.get("quantity")).intValue() : 1;
        String infill = body.getOrDefault("infill", "20%").toString();
        String quality = body.getOrDefault("quality", "Standard").toString();
        // color/notes (both optional) have no home on Estimate — echoed
        // back in the response below and carried onto the PrintJob via
        // Payment (see PaymentService.initiatePayment()/handleWebhook()).
        String color = body.get("color") != null ? body.get("color").toString() : null;
        String notes = body.get("notes") != null ? body.get("notes").toString() : null;

        // 4. Reuse existing estimate or calculate fresh one
        Estimate estimate;
        if (body.containsKey("estimate_id") && body.get("estimate_id") != null) {
            Long estimateId = ((Number) body.get("estimate_id")).longValue();
            Optional<Estimate> existing = estimateRepository.findById(estimateId);
            if (existing.isPresent() && caller.getUserId().equals(existing.get().getUserId())) {
                estimate = existing.get();
            } else {
                estimate = calculateMarketplaceEstimate(fileId, quality, infill, quantity, material, caller.getUserId(), listingId);
            }
        } else {
            estimate = calculateMarketplaceEstimate(fileId, quality, infill, quantity, material, caller.getUserId(), listingId);
        }

        // basePrice is deliberately NOT added to the estimate's totalCost
        // here. Estimate.totalCost is meant to stay pure machine+material
        // cost end to end — PaymentService.initiatePayment() is the single
        // place basePrice gets folded in, to compute the actual amount
        // charged. Adding it here too used to double-charge the customer:
        // this mutation was persisted (estimateRepository.save()), so by
        // the time initiatePayment() read the same Estimate row and added
        // basePrice again, the total already had one copy baked in.

        // 5. No PrintJob here — PaymentService.handleWebhook is the only place
        // a PrintJob gets created, gated on payment actually clearing (#58).
        // Creating one here too meant every paid order produced two PrintJob
        // rows, and an abandoned checkout left an orphaned unpaid one sitting
        // in the staff queue indistinguishable from a paid job.

        // 6. Designer earnings are incremented in PaymentService.handleWebhook
        // after payment actually confirms — not here at submission time.
        // Counting here would over-report if the user abandons checkout or
        // payment fails.

        // 7. Notify customer — payment, not staff review, is the next step.
        notificationService.createNotification(
                caller.getUserId(),
                "Order Submitted",
                "Your order for '" + listing.getTitle() + "' has been submitted and is awaiting payment.",
                "info"
        );

        return ResponseEntity.ok(new OrderAwaitingPaymentResponse(estimate, listingId, color, notes));
    }

    // ── Bring-Your-Own-File Upload (backward compat) ──────────────────────────

    @PostMapping(path = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<OrderAwaitingPaymentResponse> submitJob(
            @RequestPart("file") MultipartFile file,
            @RequestParam("material") String material,
            @RequestParam("color") String color,
            @RequestParam("quantity") int quantity,
            @RequestParam(value = "infill", defaultValue = "20%") String infill,
            @RequestParam(value = "quality", defaultValue = "Standard") String quality,
            @RequestParam(value = "notes", required = false) String notes,
            Authentication authentication) {

        User caller = currentUser(authentication);

        ModelFile savedFile = fileService.saveFileMetadata(file, caller.getUserId());
        Estimate estimate = calculateEstimate(savedFile.getFileId(), quality, infill, quantity, material, caller.getUserId());

        // No PrintJob here — PaymentService.handleWebhook is the only place a
        // PrintJob gets created, gated on payment actually clearing (#58).
        // material/quantity/infill/quality are folded into the Estimate
        // above; color/notes have no home on Estimate, so they're echoed
        // back in the response instead — the frontend forwards them on the
        // follow-up POST /api/payments/initiate call, which is what
        // actually carries them onto the Payment row (and from there,
        // handleWebhook() copies them onto the PrintJob it creates).

        notificationService.createNotification(
                caller.getUserId(),
                "Job Submitted",
                "Your print job for '" + savedFile.getFileName() + "' has been submitted and is awaiting payment.",
                "info"
        );

        return ResponseEntity.ok(new OrderAwaitingPaymentResponse(estimate, null, color, notes));
    }

    // ── List Jobs ────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<PrintJobResponse>> getJobs(
            @RequestParam(required = false) String status,
            Authentication authentication) {

        List<PrintJob> jobs;
        if (isStaff(authentication)) {
            String normalizedStatus = status != null ? status.toUpperCase() : null;
            jobs = normalizedStatus != null ? printJobRepository.findByStatus(normalizedStatus)
                    : printJobRepository.findAll();
        } else {
            User caller = currentUser(authentication);
            jobs = printJobRepository.findByUserId(caller.getUserId());
            if (status != null) {
                String normalizedStatus = status.toUpperCase();
                jobs = jobs.stream().filter(j -> normalizedStatus.equals(j.getStatus())).toList();
            }
        }

        JobLookups lookups = batchLookupsFor(jobs);

        AtomicInteger position = new AtomicInteger(0);
        List<PrintJobResponse> responses = jobs.stream().map(job -> {
            ModelFile file = lookups.files().get(job.getFileId());
            User owner = lookups.users().get(job.getUserId());
            Estimate estimate = lookups.estimates().get(job.getEstimateId());
            int pos = "QUEUED".equals(job.getStatus()) ? position.incrementAndGet() : 0;
            return toResponse(job, file, owner, estimate, pos);
        }).toList();

        return ResponseEntity.ok(responses);
    }

    // ── Staff Queue View (grouped by status) ─────────────────────────────────

    private static final List<String> QUEUE_STATUSES =
            List.of("SUBMITTED", "APPROVED", "PRINTING", "READY", "COLLECTED");

    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @GetMapping("/queue")
    public ResponseEntity<Map<String, List<PrintJobResponse>>> getQueueView() {
        // Pre-seed every group so an empty status still comes back as [],
        // not a missing key — the frontend can render all 5 columns
        // unconditionally.
        Map<String, List<PrintJobResponse>> grouped = new LinkedHashMap<>();
        for (String status : QUEUE_STATUSES) {
            grouped.put(status, new ArrayList<>());
        }

        List<PrintJob> queueJobs = printJobRepository.findAll().stream()
                .filter(job -> QUEUE_STATUSES.contains(job.getStatus()))
                // Sorting the flat list first (rather than sorting each group
                // separately) and then appending into buckets preserves FIFO
                // order within each group just the same, with one pass.
                .sorted(Comparator.comparing(
                        PrintJob::getSubmittedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        JobLookups lookups = batchLookupsFor(queueJobs);

        queueJobs.forEach(job -> {
            ModelFile file = lookups.files().get(job.getFileId());
            User owner = lookups.users().get(job.getUserId());
            Estimate estimate = lookups.estimates().get(job.getEstimateId());
            grouped.get(job.getStatus()).add(toResponse(job, file, owner, estimate));
        });

        return ResponseEntity.ok(grouped);
    }

    // ── Get Single Job ───────────────────────────────────────────────────────

    @GetMapping("/{jobId}")
    public ResponseEntity<PrintJobResponse> getJob(
            @PathVariable Long jobId,
            Authentication authentication) {

        PrintJob job = printQueueService.getJobById(jobId);

        if (!isStaff(authentication)) {
            User caller = currentUser(authentication);
            if (!job.getUserId().equals(caller.getUserId())) {
                throw new AccessDeniedException("You can only view your own print jobs");
            }
        }

        ModelFile file = safeGetFile(job.getFileId());
        User owner = safeGetUser(job.getUserId());
        Estimate estimate = safeGetEstimate(job.getEstimateId());

        return ResponseEntity.ok(toResponse(job, file, owner, estimate));
    }

    // ── Approve Job (Staff only) ─────────────────────────────────────────────

    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @PatchMapping("/{jobId}/approve")
    public ResponseEntity<PrintJobResponse> approveJob(
            @PathVariable Long jobId,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {

        PrintJob job = printQueueService.getJobById(jobId);

        Double estimatedCost = body.get("estimated_cost") != null
                ? ((Number) body.get("estimated_cost")).doubleValue() : null;
        Integer estimatedTime = body.get("estimated_time") != null
                ? ((Number) body.get("estimated_time")).intValue() : null;
        String printerId = (String) body.get("printer_id");

        if (job.getEstimateId() != null) {
            estimateRepository.findById(job.getEstimateId()).ifPresent(est -> {
                if (estimatedCost != null) est.setTotalCost(estimatedCost);
                if (estimatedTime != null) est.setDurationMinutes(estimatedTime.doubleValue());
                estimateRepository.save(est);
            });
        }

        PrintJob updatedJob = printQueueService.updateJobStatus(
                jobId, "APPROVED", printerId, null, null);

        labLocationService.getActiveLab().map(LabLocation::getId).ifPresent(updatedJob::setLabLocationId);
        updatedJob = printJobRepository.save(updatedJob);

        notificationService.createNotification(
                job.getUserId(),
                "Job Approved",
                "Your print job has been approved" +
                        (estimatedCost != null ? String.format(". Estimated cost: GH₵%.2f", estimatedCost) : "") + ".",
                NotificationType.JOB_APPROVED
        );

        ModelFile file = safeGetFile(updatedJob.getFileId());
        User owner = safeGetUser(updatedJob.getUserId());
        Estimate estimate = safeGetEstimate(updatedJob.getEstimateId());

        return ResponseEntity.ok(toResponse(updatedJob, file, owner, estimate));
    }

    // ── Reject Job (Staff only) ──────────────────────────────────────────────

    @PreAuthorize("hasAnyRole('LAB_STAFF', 'ADMIN')")
    @PatchMapping("/{jobId}/reject")
    public ResponseEntity<PrintJobResponse> rejectJob(
            @PathVariable Long jobId,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication authentication) {

        PrintJob job = printQueueService.getJobById(jobId);
        String reason = body != null && body.get("reason") != null
                ? (String) body.get("reason") : "Rejected by lab staff";

        PrintJob updatedJob = printQueueService.updateJobStatus(
                jobId, "REJECTED", null, reason, null);

        notificationService.createNotification(
                job.getUserId(),
                "Job Rejected",
                "Your print job has been rejected. Reason: " + reason,
                NotificationType.JOB_REJECTED
        );

        ModelFile file = safeGetFile(updatedJob.getFileId());
        User owner = safeGetUser(updatedJob.getUserId());
        Estimate estimate = safeGetEstimate(updatedJob.getEstimateId());

        return ResponseEntity.ok(toResponse(updatedJob, file, owner, estimate));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Used for bring-your-own-file submissions — the file belongs to the caller. */
    private Estimate calculateEstimate(Long fileId, String quality, String infill, int quantity,
                                        String material, Long userId) {
        String mappedQuality = mapQuality(quality);
        int infillPercent = parseInfill(infill);
        return estimateService.calculateAndSaveEstimate(
                fileId, mappedQuality, infillPercent, quantity, material.toUpperCase(), userId);
    }

    /**
     * Used for marketplace submissions — the file belongs to the designer, not
     * the customer. skipOwnershipCheck=true is safe here because the listing
     * has already been verified as PUBLISHED before this is called. Passing
     * listingId snapshots the listing's current basePrice onto
     * Estimate.lockedBasePrice, which PaymentService.initiatePayment() charges
     * instead of re-reading a possibly-since-changed live basePrice.
     */
    private Estimate calculateMarketplaceEstimate(Long fileId, String quality, String infill,
                                                   int quantity, String material, Long userId, Long listingId) {
        String mappedQuality = mapQuality(quality);
        int infillPercent = parseInfill(infill);
        return estimateService.calculateAndSaveEstimate(
                fileId, mappedQuality, infillPercent, quantity, material.toUpperCase(), userId, true, listingId);
    }

    private PrintJobResponse toResponse(PrintJob job, ModelFile file, User owner, Estimate estimate) {
        return toResponse(job, file, owner, estimate, 0);
    }

    private PrintJobResponse toResponse(PrintJob job, ModelFile file, User owner, Estimate estimate, int queuePosition) {
        PrintJobResponse r = new PrintJobResponse();
        r.setJobId(String.valueOf(job.getId()));
        r.setUserId(String.valueOf(job.getUserId()));
        r.setUserName(owner != null ? owner.getFullName() : "Unknown");
        r.setFileName(file != null ? file.getFileName() : "Unknown file");
        r.setMaterial(job.getMaterial());
        r.setColor(job.getColor());
        r.setQuantity(job.getQuantity());
        r.setStatus(job.getStatus());
        r.setSubmittedAt(job.getSubmittedAt() != null ? job.getSubmittedAt().toString() : null);
        r.setNotes(job.getNotes());
        r.setPrinterName(job.getAssignedPrinter());
        if (queuePosition > 0) r.setQueuePosition(queuePosition);

        if (estimate != null) {
            r.setEstimatedCost(estimate.getTotalCost());
            if (estimate.getDurationMinutes() != null) {
                r.setEstimatedTime(estimate.getDurationMinutes().intValue());
            }
        }

        if (job.getLabLocationId() != null) {
            labLocationService.findById(job.getLabLocationId())
                    .ifPresent(lab -> r.setPickupLocation(LabLocationSummary.from(lab)));
        }

        return r;
    }

    private String mapQuality(String quality) {
        if (quality == null) return "STANDARD";
        return switch (quality.trim()) {
            case "Draft" -> "DRAFT";
            case "Fine"  -> "HIGH";
            default      -> "STANDARD";
        };
    }

    private int parseInfill(String infill) {
        if (infill == null) return 20;
        try {
            return Integer.parseInt(infill.replace("%", "").trim());
        } catch (NumberFormatException e) {
            return 20;
        }
    }

    /** Batched file/user/estimate lookups for a job list — see batchLookupsFor(). */
    private record JobLookups(Map<Long, ModelFile> files, Map<Long, User> users, Map<Long, Estimate> estimates) {}

    /**
     * Batch lookup for list endpoints (getJobs(), getQueueView()) — one
     * findAllById() per entity type covering every job in the list,
     * instead of safeGetFile()/safeGetUser()/safeGetEstimate() called
     * once per job per entity type (#61 — was 3×N queries for N jobs).
     * Same collect-ids-then-findAllById-then-toMap shape as
     * MarketplaceController.enrichWithDesigner(List). A missing id in the
     * resulting map (key not found → Map.get returns null) reproduces
     * the exact same "not found = null" behavior safeGetX() already had —
     * this only changes how the data is fetched, not what happens when
     * an entity is absent. getJob()/approveJob()/rejectJob() (single-job
     * endpoints, N=1, nothing to batch) keep calling safeGetFile()/
     * safeGetUser()/safeGetEstimate() directly, unchanged.
     */
    private JobLookups batchLookupsFor(List<PrintJob> jobs) {
        List<Long> fileIds = jobs.stream().map(PrintJob::getFileId).filter(Objects::nonNull).distinct().toList();
        List<Long> userIds = jobs.stream().map(PrintJob::getUserId).filter(Objects::nonNull).distinct().toList();
        List<Long> estimateIds = jobs.stream().map(PrintJob::getEstimateId).filter(Objects::nonNull).distinct().toList();

        Map<Long, ModelFile> files = fileService.getFilesByIds(fileIds).stream()
                .collect(Collectors.toMap(ModelFile::getFileId, f -> f));
        Map<Long, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));
        Map<Long, Estimate> estimates = estimateRepository.findAllById(estimateIds).stream()
                .collect(Collectors.toMap(Estimate::getId, e -> e));

        return new JobLookups(files, users, estimates);
    }

    private ModelFile safeGetFile(Long fileId) {
        if (fileId == null) return null;
        try { return fileService.getFileById(fileId); } catch (Exception e) { return null; }
    }

    private User safeGetUser(Long userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).orElse(null);
    }

    private Estimate safeGetEstimate(Long estimateId) {
        if (estimateId == null) return null;
        return estimateRepository.findById(estimateId).orElse(null);
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(r -> r.equals("ROLE_LAB_STAFF") || r.equals("ROLE_ADMIN"));
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
