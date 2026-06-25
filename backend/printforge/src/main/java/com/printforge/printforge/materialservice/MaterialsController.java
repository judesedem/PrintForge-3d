package com.printforge.printforge.materialservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GET /api/materials — returns the available print materials with colors
 * and pricing. Hardcoded for now (no DB table needed for CodeFest scope);
 * matches the Material TypeScript interface the frontend expects.
 *
 * cost_per_gram is expressed in GH₵ per gram and matches the rates used by
 * EstimateService (PLA: 0.05, RESIN: 0.15, ABS: 0.08). Previously this
 * field was named cost_per_unit and held values 100× too large (5.00,
 * 15.00, 8.00), causing a visible mismatch between the materials listing
 * and any cost estimate shown alongside it.
 */
@RestController
@RequestMapping("/api/materials")
public class MaterialsController {

    @GetMapping
    public ResponseEntity<List<MaterialDto>> getMaterials() {
        return ResponseEntity.ok(List.of(
            new MaterialDto(
                "mat-1", "PLA",
                List.of("White", "Black", "Grey", "Red", "Blue", "Green", "Yellow", "Orange"),
                0.05, "available",
                "Standard thermoplastic. Great for most prints — easy to use, low warp, good detail."
            ),
            new MaterialDto(
                "mat-2", "RESIN",
                List.of("Clear", "White", "Grey", "Black"),
                0.15, "available",
                "High-detail photopolymer resin. Best for miniatures, jewellery, and fine detail work."
            ),
            new MaterialDto(
                "mat-3", "ABS",
                List.of("Black", "White", "Grey"),
                0.08, "low",
                "Engineering-grade plastic. More durable and heat-resistant than PLA. Low stock."
            )
        ));
    }

    // ── DTO ─────────────────────────────────────────────────────────────────

    public static class MaterialDto {

        @JsonProperty("material_id")
        private final String materialId;

        @JsonProperty("material_name")
        private final String materialName;

        private final List<String> colors;

        @JsonProperty("cost_per_gram")
        private final double costPerUnit;  // stored as GH₵ per gram

        @JsonProperty("availability_status")
        private final String availabilityStatus;

        private final String description;

        public MaterialDto(String materialId, String materialName, List<String> colors,
                           double costPerUnit, String availabilityStatus, String description) {
            this.materialId = materialId;
            this.materialName = materialName;
            this.colors = colors;
            this.costPerUnit = costPerUnit;
            this.availabilityStatus = availabilityStatus;
            this.description = description;
        }

        public String getMaterialId() { return materialId; }
        public String getMaterialName() { return materialName; }
        public List<String> getColors() { return colors; }
        public double getCostPerGram() { return costPerUnit; }
        public String getAvailabilityStatus() { return availabilityStatus; }
        public String getDescription() { return description; }
    }
}
