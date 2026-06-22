package com.printforge.printforge.estimateservice.service;

import com.printforge.printforge.estimateservice.exception.EstimateNotFoundException;
import com.printforge.printforge.estimateservice.exception.InvalidEstimateInputException;
import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import com.printforge.printforge.fileservice.exception.ModelFileNotFoundException;
import com.printforge.printforge.fileservice.model.ModelFile;
import com.printforge.printforge.fileservice.repository.ModelFileRepository;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class EstimateService {

    private static final Set<String> VALID_QUALITIES = Set.of("DRAFT", "STANDARD", "HIGH");
    private static final Set<String> VALID_MATERIALS = Set.of("PLA", "RESIN", "ABS");

    private final EstimateRepository estimateRepository;
    private final ModelFileRepository modelFileRepository;

    public EstimateService(EstimateRepository estimateRepository, ModelFileRepository modelFileRepository) {
        this.estimateRepository = estimateRepository;
        this.modelFileRepository = modelFileRepository;
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

        ModelFile file = modelFileRepository.findById(fileId)
                .orElseThrow(() -> new ModelFileNotFoundException(fileId));

        String normalizedQuality = quality.trim().toUpperCase();
        if (!VALID_QUALITIES.contains(normalizedQuality)) {
            throw new InvalidEstimateInputException(
                    "Invalid quality '" + quality + "'. Must be one of: " + VALID_QUALITIES);
        }

        String normalizedMaterial = materialType.trim().toUpperCase();
        if (!VALID_MATERIALS.contains(normalizedMaterial)) {
            throw new InvalidEstimateInputException(
                    "Invalid materialType '" + materialType + "'. Must be one of: " + VALID_MATERIALS);
        }

        double fileSizeKb = file.getFileSizeBytes() / 1024.0;

        // 1. Material Dynamic Rates (Base defaults to standard PLA)
        double baseMinutesPerGram = 2.5;
        double costPerGram = 0.05; // 5 cents per gram of PLA

        if ("RESIN".equals(normalizedMaterial)) {
            baseMinutesPerGram = 4.0;  // Resin takes longer
            costPerGram = 0.15;        // Resin is more expensive
        } else if ("ABS".equals(normalizedMaterial)) {
            baseMinutesPerGram = 2.8;
            costPerGram = 0.08;
        }

        double estimatedGrams = fileSizeKb * 0.8;

        // 2. Quality Multiplier
        double qualityMultiplier = 1.0;
        if ("DRAFT".equals(normalizedQuality)) {
            qualityMultiplier = 0.6;
        } else if ("HIGH".equals(normalizedQuality)) {
            qualityMultiplier = 1.8;
        }

        // 3. Infill Multiplier
        double infillMultiplier = 0.5 + (infillPercent / 100.0);

        // 4. Final Time Math
        double durationMinutes = baseMinutesPerGram * estimatedGrams * qualityMultiplier * infillMultiplier * quantity;

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

        return estimateRepository.save(estimate);
    }

    /** GET /api/estimates/{id} — didn't exist before at all. */
    public Estimate getEstimateById(Long id) {
        return estimateRepository.findById(id)
                .orElseThrow(() -> new EstimateNotFoundException(id));
    }
}
