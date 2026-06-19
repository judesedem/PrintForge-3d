package com.printforge.printforge.estimateservice.controller;

import com.printforge.printforge.estimateservice.model.Estimate;
import com.printforge.printforge.estimateservice.service.EstimateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/estimates")
public class EstimateController {

    private final EstimateService estimateService;

    // Injecting the service layer so the controller can access the math logic
    public EstimateController(EstimateService estimateService) {
        this.estimateService = estimateService;
    }

    // Maps to POST /api/estimates
    @PostMapping
    public ResponseEntity<Estimate> createEstimate(
            @RequestParam Double fileSizeKb,
            @RequestParam String quality,
            @RequestParam Integer infillPercent,
            @RequestParam Integer quantity) {

        Estimate newEstimate = estimateService.calculateAndSaveEstimate(fileSizeKb, quality, infillPercent, quantity);
        return ResponseEntity.ok(newEstimate);
    }
}