package com.printforge.printforge.facade;

import com.printforge.printforge.entity.User;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.estimateservice.service.EstimateService;
import com.printforge.printforge.facade.dto.PrintJobResponse;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.service.FileService;
import com.printforge.printforge.marketplaceservice.exception.ListingNotFoundException;
import com.printforge.printforge.marketplaceservice.exception.ListingNotPublishedException;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.notificationservice.service.NotificationService;
import com.printforge.printforge.queueservice.model.PrintJob;
import com.printforge.printforge.queueservice.repository.PrintJobRepository;
import com.printforge.printforge.queueservice.service.PrintQueueService;
import com.printforge.printforge.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Bridges the frontend's 1-step job submission flow to the backend's
 * multi-service architecture.
 *
 * POST /api/print-jobs         → marketplace order (JSON: listing_id + print params)
 * POST /api/print-jobs/upload  → bring-your-own-file (multipart, backward compat)
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

    public PrintJobFacadeController(
            FileService fileService,
            EstimateService estimateService,
            PrintQueueService printQueueService,
            PrintJobRepository printJobRepository,
            EstimateRepository estimateRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            DesignListingRepository designListingRepository) {
        this.fileService = fileService;
        this.estimateService = estimateService;
        this.printQueueService = printQueueService;
        this.printJobRepository = printJobRepository;
        this.estimateRepository = estimateRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.designListingRepository = designListingRepository;
    }

    // ── Marketplace Order (JSON body with listing_id) ─────────────────────────

    @PostMapping(consumes = "application/json")
    public ResponseEntity<PrintJobResponse> submitMarketplaceOrder(
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
        String color = body.getOrDefault("color", "").toString();
        int quantity = body.containsKey("quantity") ? ((Number) body.get("quantity")).intValue() : 1;
        String infill = body.getOrDefault("infill", "20%").toString();
        String quality = body.getOrDefault("quality", "Standard").toString();
        String notes = body.containsKey("notes") ? body.get("notes").toString() : null;

        // 4. Reuse existing estimate or calculate fresh one
        Estimate estimate;
        if (body.containsKey("estimate_id") && body.get("estimate_id") != null) {
            Long estimateId = ((Number) body.get("estimate_id")).longValue();
            Optional<Estimate> existing = estimateRepository.findById(estimateId);
            if (existing.isPresent() && caller.getUserId().equals(existing.get().getUserId())) {
                estimate = existing.get();
            } else {
                estimate = calculateMarketplaceEstimate(fileId, quality, infill, quantity, material, caller.getUserId());
            }
        } else {
            estimate = calculateMarketplaceEstimate(fileId, quality, infill, quantity, material, caller.getUserId());
        }

        // Add designer's base_price on top of machine+material cost
        if (listing.getBasePrice() != null) {
            estimate.setTotalCost(estimate.getTotalCost() + listing.getBasePrice().doubleValue());
            estimateRepository.save(estimate);
        }

        // 5. Create the print job via PrintQueueService.
        // skipFileOwnershipCheck=true: the file belongs to the designer; the
        // listing being PUBLISHED is the gate that authorises the customer to
        // order it. Estimate ownership is still enforced inside the service.
        PrintJob savedJob = printQueueService.createPrintJob(
                fileId, estimate.getId(), caller.getUserId(),
                material, color, quantity, infill, quality, notes,
                true);

        // 6. Designer earnings are incremented in PaymentService.handleWebhook
        // after payment actually confirms — not here at submission time.
        // Counting here would over-report if the user abandons checkout or
        // payment fails.

        // 7. Notify customer
        notificationService.createNotification(
                caller.getUserId(),
                "Order Submitted",
                "Your order for '" + listing.getTitle() + "' has been submitted and is awaiting review.",
                "info"
        );

        ModelFile file = safeGetFile(fileId);
        return ResponseEntity.ok(toResponse(savedJob, file, caller, estimate));
    }

    // ── Bring-Your-Own-File Upload (backward compat) ──────────────────────────

    @PostMapping(path = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<PrintJobResponse> submitJob(
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

        // Route through the service so ownership checks are always enforced.
        // skipFileOwnershipCheck=false: the file was just uploaded by this
        // caller, so the check will pass — but we keep it on for correctness.
        PrintJob savedJob = printQueueService.createPrintJob(
                savedFile.getFileId(), estimate.getId(), caller.getUserId(),
                material, color, quantity, infill, quality, notes,
                false);

        notificationService.createNotification(
                caller.getUserId(),
                "Job Submitted",
                "Your print job for '" + savedFile.getFileName() + "' has been submitted and is awaiting review.",
                "info"
        );

        return ResponseEntity.ok(toResponse(savedJob, savedFile, caller, estimate));
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

        AtomicInteger position = new AtomicInteger(0);
        List<PrintJobResponse> responses = jobs.stream().map(job -> {
            ModelFile file = safeGetFile(job.getFileId());
            User owner = safeGetUser(job.getUserId());
            Estimate estimate = safeGetEstimate(job.getEstimateId());
            int pos = "QUEUED".equals(job.getStatus()) ? position.incrementAndGet() : 0;
            return toResponse(job, file, owner, estimate, pos);
        }).toList();

        return ResponseEntity.ok(responses);
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

        notificationService.createNotification(
                job.getUserId(),
                "Job Approved",
                "Your print job has been approved" +
                        (estimatedCost != null ? String.format(". Estimated cost: GH₵%.2f", estimatedCost) : "") + ".",
                "success"
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
                "error"
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
     * has already been verified as PUBLISHED before this is called.
     */
    private Estimate calculateMarketplaceEstimate(Long fileId, String quality, String infill,
                                                   int quantity, String material, Long userId) {
        String mappedQuality = mapQuality(quality);
        int infillPercent = parseInfill(infill);
        return estimateService.calculateAndSaveEstimate(
                fileId, mappedQuality, infillPercent, quantity, material.toUpperCase(), userId, true);
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
