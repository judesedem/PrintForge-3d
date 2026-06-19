package com.printforge.printforge.estimateservice.service;

import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.repository.EstimateRepository; // Make sure to create a basic JpaRepository interface!
import org.springframework.stereotype.Service;

@Service
public class EstimateService {

    private final EstimateRepository estimateRepository;

    public EstimateService(EstimateRepository estimateRepository) {
        this.estimateRepository = estimateRepository;
    }

    public Estimate calculateAndSaveEstimate(Double fileSizeKb, String quality, Integer infillPercent, Integer quantity) {
        // 1. Constants & Base Calcs
        final double BASE_MINUTES_PER_GRAM = 2.5;
        double estimatedGrams = fileSizeKb * 0.8;

        // 2. Quality Multiplier
        double qualityMultiplier = 1.0; // Default to standard
        if ("DRAFT".equalsIgnoreCase(quality)) {
            qualityMultiplier = 0.6;
        } else if ("HIGH".equalsIgnoreCase(quality)) {
            qualityMultiplier = 1.8;
        }

        // 3. Infill Multiplier (Using 100.0 to prevent integer division zero-ing out the decimal)
        double infillMultiplier = 0.5 + (infillPercent / 100.0);

        // 4. Final Math
        double durationMinutes = BASE_MINUTES_PER_GRAM * estimatedGrams * qualityMultiplier * infillMultiplier * quantity;

        // 5. Save to Database
        Estimate estimate = new Estimate();
        estimate.setFileSizeKb(fileSizeKb);
        estimate.setQuality(quality.toUpperCase());
        estimate.setInfillPercent(infillPercent);
        estimate.setQuantity(quantity);
        estimate.setEstimatedGrams(estimatedGrams);
        estimate.setDurationMinutes(durationMinutes);

        return estimateRepository.save(estimate);
    }
}