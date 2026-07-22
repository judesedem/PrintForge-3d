package com.printforge.printforge.estimateservice.service;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.estimateservice.exception.EstimateNotFoundException;
import com.printforge.printforge.estimateservice.exception.InvalidEstimateInputException;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.fileservice.exception.ModelFileNotFoundException;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import com.printforge.printforge.marketplaceservice.model.DesignListing;
import com.printforge.printforge.marketplaceservice.repository.DesignListingRepository;
import com.printforge.printforge.materialservice.model.Material;
import com.printforge.printforge.materialservice.repository.MaterialRepository;
import com.printforge.printforge.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Set;

@Slf4j
@Service
public class EstimateService {

    private static final Set<String> VALID_QUALITIES = Set.of("DRAFT", "STANDARD", "HIGH");

    // Assumed print-shell thickness, used to split a mesh's total volume
    // into a solid outer shell + infill-percentage-scaled interior.
    private static final double WALL_THICKNESS_MM = 1.2;

    private final EstimateRepository estimateRepository;
    private final ModelFileRepository modelFileRepository;
    private final UserRepository userRepository;
    private final DesignListingRepository listingRepository;
    private final MaterialRepository materialRepository;

    public EstimateService(EstimateRepository estimateRepository,
                           ModelFileRepository modelFileRepository,
                           UserRepository userRepository,
                           DesignListingRepository listingRepository,
                           MaterialRepository materialRepository) {
        this.estimateRepository = estimateRepository;
        this.modelFileRepository = modelFileRepository;
        this.userRepository = userRepository;
        this.listingRepository = listingRepository;
        this.materialRepository = materialRepository;
    }

    /**
     * Previously took fileSizeKb directly as a client-supplied number —
     * meaning a student could send any value they wanted and get whatever
     * cost/duration that produced. Now it takes fileId and looks up the
     * actual stored file size from File Service, so the number driving the
     * cost calculation can't be fabricated by the client.
     */
    public Estimate calculateAndSaveEstimate(Long fileId, String quality, Integer infillPercent,
                                              Integer quantity, String materialType, Long requesterId) {
        return calculateAndSaveEstimate(fileId, quality, infillPercent, quantity, materialType, requesterId, false);
    }

    /**
     * Marketplace-aware overload. Pass skipOwnershipCheck=true only when the
     * caller has already verified the file belongs to a PUBLISHED listing —
     * e.g. MarketplaceController.getListing() and
     * PrintJobFacadeController.submitMarketplaceOrder(). This lets a customer
     * generate a quote against a designer's file without triggering the
     * ownership guard, which would otherwise always deny them access.
     *
     * Never pass skipOwnershipCheck=true from user-facing endpoints that take
     * a raw fileId from the client — that would re-open the IDOR the ownership
     * check was added to close.
     */
    public Estimate calculateAndSaveEstimate(Long fileId, String quality, Integer infillPercent,
                                              Integer quantity, String materialType, Long requesterId,
                                              boolean skipOwnershipCheck) {
        return calculateAndSaveEstimate(fileId, quality, infillPercent, quantity, materialType,
                requesterId, skipOwnershipCheck, null);
    }

    /**
     * Marketplace-listing-aware overload — pass listingId when this estimate
     * is for a specific DesignListing (order submission or the storefront's
     * auto-quote), so the listing's current basePrice gets snapshotted onto
     * Estimate.lockedBasePrice at quote time. PaymentService.initiatePayment()
     * later charges that locked value instead of re-reading the listing's
     * (possibly since-changed) live basePrice. null for BYOF jobs, which
     * have no listing at all.
     */
    public Estimate calculateAndSaveEstimate(Long fileId, String quality, Integer infillPercent,
                                              Integer quantity, String materialType, Long requesterId,
                                              boolean skipOwnershipCheck, Long listingId) {

        ModelFile file = modelFileRepository.findById(fileId)
                .orElseThrow(() -> new ModelFileNotFoundException(fileId));

        if (!skipOwnershipCheck) {
            // Only the file owner or staff can generate an estimate against a file.
            // This stops anyone from probing file sizes of files they don't own
            // by passing arbitrary fileIds to this endpoint.
            boolean isStaff = userRepository.findById(requesterId)
                    .map(u -> u.getRole() == Role.LAB_STAFF || u.getRole() == Role.ADMIN)
                    .orElse(false);

            if (!isStaff && !requesterId.equals(file.getUserId())) {
                throw new AccessDeniedException(
                        "You can only generate estimates for your own files.");
            }
        }

        String normalizedQuality = quality.trim().toUpperCase();
        if (!VALID_QUALITIES.contains(normalizedQuality)) {
            throw new InvalidEstimateInputException(
                    "Invalid quality '" + quality + "'. Must be one of: " + VALID_QUALITIES);
        }

        // Material name/cost_per_gram/baseMinutesPerGram/density all come
        // from the shared `materials` table (see materialservice.model
        // .Material) — the same table MaterialsController and
        // PATCH /api/admin/materials/{name} read/write. A previous version
        // of this method had its own hardcoded if/else ladder here,
        // independent of MaterialsController's — the two had already
        // drifted (PETG/CARBON_FIBER disagreed on price). Reading one
        // table instead of two hardcoded copies is what closes that gap.
        String normalizedMaterial = materialType.trim().toUpperCase();
        Material material = materialRepository.findByName(normalizedMaterial)
                .orElseThrow(() -> new InvalidEstimateInputException(
                        "Invalid materialType '" + materialType + "'. Must be one of: " + validMaterialNames()));

        double fileSizeKb = file.getFileSizeBytes() / 1024.0;

        // 1. Material Dynamic Rates
        double baseMinutesPerGram = material.getBaseMinutesPerGram();
        double costPerGram = material.getCostPerGram();

        // Pre-sliced weight (gcode uploads — GCodeWeightParser) takes
        // priority over everything else: the slicer already computed the
        // real answer, so there's no reason to re-derive it from geometry
        // or file size. Checked before the geometryParsed branch below.
        // Real STL/OBJ/3MF/AMF/PLY geometry beats the file-size heuristic
        // when available — file size reflects mesh triangle count/detail,
        // not physical volume, and can be off by an order of magnitude
        // (see Handoff.md for a worked before/after example). Every other
        // accepted extension, and any file of a supported format that
        // failed to parse, falls back to the old formula unchanged.
        double estimatedGrams;
        if (Boolean.TRUE.equals(file.getPreSliced()) && file.getPreSlicedWeightGrams() != null) {
            estimatedGrams = file.getPreSlicedWeightGrams();
        } else if (Boolean.TRUE.equals(file.getGeometryParsed())) {
            double shellVolumeCm3 = (file.getSurfaceAreaCm2() * WALL_THICKNESS_MM) / 10.0;
            double interiorVolumeCm3 = Math.max(file.getVolumeCm3() - shellVolumeCm3, 0);
            // guard: shell can't exceed total volume
            shellVolumeCm3 = Math.min(shellVolumeCm3, file.getVolumeCm3());
            double infillVolumeCm3 = interiorVolumeCm3 * (infillPercent / 100.0);
            double totalPrintVolumeCm3 = shellVolumeCm3 + infillVolumeCm3;
            estimatedGrams = totalPrintVolumeCm3 * material.getDensityGCm3();
        } else {
            estimatedGrams = fileSizeKb * 0.8; // existing heuristic, unchanged
            log.warn("Estimate for fileId {} used the file-size fallback formula (no parsed geometry/pre-sliced weight available)",
                    fileId);
        }

        // 2. Quality Multiplier
        double qualityMultiplier = 1.0;
        if ("DRAFT".equals(normalizedQuality)) {
            qualityMultiplier = 0.6;
        } else if ("HIGH".equals(normalizedQuality)) {
            qualityMultiplier = 1.8;
        }

        // 3. Infill Multiplier
        double infillMultiplier = 0.5 + (infillPercent / 100.0);

        // 4. Final Time Math — same pre-sliced-takes-priority rule as
        // estimatedGrams above, checked independently: a gcode file can
        // have one piece (weight or time) without the other, e.g. a
        // slicer comment giving filament length but not a time estimate.
        double durationMinutes;
        if (Boolean.TRUE.equals(file.getPreSliced()) && file.getPreSlicedDurationMinutes() != null) {
            durationMinutes = file.getPreSlicedDurationMinutes();
        } else {
            durationMinutes = baseMinutesPerGram * estimatedGrams * qualityMultiplier * infillMultiplier * quantity;
        }

        // 5. Final Cost Math (Time cost + Material cost)
        double machineTimeCost = durationMinutes * 0.02; // 2 cents per minute of machine run-time
        double physicalMaterialCost = estimatedGrams * costPerGram * quantity;
        double totalCost = machineTimeCost + physicalMaterialCost;

        // 6. Save to Database
        Estimate estimate = new Estimate();
        estimate.setFileId(fileId);
        estimate.setUserId(requesterId);
        estimate.setFileSizeKb(fileSizeKb);
        estimate.setQuality(normalizedQuality);
        estimate.setInfillPercent(infillPercent);
        estimate.setQuantity(quantity);
        estimate.setMaterialType(normalizedMaterial);
        estimate.setEstimatedGrams(estimatedGrams);
        estimate.setDurationMinutes(durationMinutes);
        estimate.setTotalCost(Math.round(totalCost * 100.0) / 100.0); // Rounds to 2 decimal places for currency!
        if (listingId != null) {
            listingRepository.findById(listingId)
                    .map(DesignListing::getBasePrice)
                    .ifPresent(estimate::setLockedBasePrice);
        }

        return estimateRepository.save(estimate);
    }

    /** GET /api/estimates/{id} — didn't exist before at all. */
    public Estimate getEstimateById(Long id) {
        return estimateRepository.findById(id)
                .orElseThrow(() -> new EstimateNotFoundException(id));
    }

    /** Only queried on the invalid-material error path, so an extra findAll() here is fine. */
    private java.util.List<String> validMaterialNames() {
        return materialRepository.findAll().stream()
                .map(Material::getName)
                .sorted()
                .toList();
    }
}


