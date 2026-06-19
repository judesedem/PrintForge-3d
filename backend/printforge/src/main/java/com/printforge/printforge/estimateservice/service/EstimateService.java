package com.printforge.printforge.estimateservice.service;

import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository;
import org.springframework.stereotype.Service;

@Service
public class EstimateService {

    private final EstimateRepository estimateRepository;

    public EstimateService(EstimateRepository estimateRepository) {
        this.estimateRepository = estimateRepository;
    }

    // NEW: Added materialType to the parameters
    public Estimate calculateAndSaveEstimate(Double fileSizeKb, String quality, Integer infillPercent, Integer quantity, String materialType) {

        // 1. Material Dynamic Rates (Base defaults to standard PLA)
        double baseMinutesPerGram = 2.5;
        double costPerGram = 0.05; // 5 cents per gram of PLA

        if ("RESIN".equalsIgnoreCase(materialType)) {
            baseMinutesPerGram = 4.0;  // Resin takes longer
            costPerGram = 0.15;        // Resin is more expensive
        } else if ("ABS".equalsIgnoreCase(materialType)) {
            baseMinutesPerGram = 2.8;
            costPerGram = 0.08;
        }

        double estimatedGrams = fileSizeKb * 0.8;

        // 2. Quality Multiplier
        double qualityMultiplier = 1.0;
        if ("DRAFT".equalsIgnoreCase(quality)) {
            qualityMultiplier = 0.6;
        } else if ("HIGH".equalsIgnoreCase(quality)) {
            qualityMultiplier = 1.8;
        }

        // 3. Infill Multiplier
        double infillMultiplier = 0.5 + (infillPercent / 100.0);

        // 4. Final Time Math
        double durationMinutes = baseMinutesPerGram * estimatedGrams * qualityMultiplier * infillMultiplier * quantity;

        // 5. NEW: Final Cost Math (Time cost + Material cost)
        double machineTimeCost = durationMinutes * 0.02; // 2 cents per minute of machine run-time
        double physicalMaterialCost = estimatedGrams * costPerGram * quantity;
        double totalCost = machineTimeCost + physicalMaterialCost;

        // 6. Save to Database
        Estimate estimate = new Estimate();
        estimate.setFileSizeKb(fileSizeKb);
        estimate.setQuality(quality.toUpperCase());
        estimate.setInfillPercent(infillPercent);
        estimate.setQuantity(quantity);
        estimate.setMaterialType(materialType.toUpperCase()); // Save the new material
        estimate.setEstimatedGrams(estimatedGrams);
        estimate.setDurationMinutes(durationMinutes);
        estimate.setTotalCost(Math.round(totalCost * 100.0) / 100.0); // Rounds to 2 decimal places for currency!

        return estimateRepository.save(estimate);
    }
}