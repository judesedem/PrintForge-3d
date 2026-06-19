package com.printforge.printforge.estimateservice.controller;

import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.service.EstimateService;
import jakarta.validation.constraints.*;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/estimates")
@Validated // NEW: Tells Spring Boot to enforce the math rules below
public class EstimateController {

    private final EstimateService estimateService;

    public EstimateController(EstimateService estimateService) {
        this.estimateService = estimateService;
    }

    @PostMapping
    public ResponseEntity<Estimate> createEstimate(
            // Validation Rules added to block bad data!
            @RequestParam @NotNull @Min(1) Double fileSizeKb,
            @RequestParam @NotBlank String quality,
            @RequestParam @NotNull @Min(0) @Max(100) Integer infillPercent,
            @RequestParam @NotNull @Min(1) Integer quantity,
            @RequestParam @NotBlank String materialType) { // NEW: Expect the material type

        Estimate newEstimate = estimateService.calculateAndSaveEstimate(
                fileSizeKb, quality, infillPercent, quantity, materialType);

        return ResponseEntity.ok(newEstimate);
    }
}