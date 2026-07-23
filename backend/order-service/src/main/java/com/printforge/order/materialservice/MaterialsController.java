package com.printforge.order.materialservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.printforge.order.materialservice.model.Material;
import com.printforge.order.materialservice.repository.MaterialRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GET /api/materials — returns the available print materials with colors
 * and pricing. Backed by the `materials` table (see materialservice.model
 * .Material) — the same table EstimateService (in this service AND
 * marketplace-service) reads cost_per_gram/baseMinutesPerGram/density
 * from for its cost calculation, so this listing can never drift out of
 * sync with what a customer is actually charged the way it previously did
 * (PETG/CARBON_FIBER had two different hardcoded cost_per_gram values
 * before this migration — see config/MaterialSeeder.java's javadoc for the
 * full history). Admin edits via PATCH /api/admin/materials/{name}
 * (admin-service) show up here immediately, same table, no caching.
 *
 * material_id is now the real numeric row id (as a string) rather than the
 * old hardcoded "mat-1".."mat-5" — the frontend only ever treats this field
 * as an opaque string key, never parses or compares it, so this is not a
 * breaking change.
 */
@RestController
@RequestMapping("/api/materials")
public class MaterialsController {

    private final MaterialRepository materialRepository;

    public MaterialsController(MaterialRepository materialRepository) {
        this.materialRepository = materialRepository;
    }

    @GetMapping
    public ResponseEntity<List<MaterialDto>> getMaterials() {
        List<MaterialDto> materials = materialRepository.findAll().stream()
                .map(MaterialsController::toDto)
                .toList();
        return ResponseEntity.ok(materials);
    }

    private static MaterialDto toDto(Material material) {
        return new MaterialDto(
                String.valueOf(material.getId()),
                material.getName(),
                material.getColors(),
                material.getCostPerGram(),
                material.getAvailabilityStatus(),
                material.getDescription()
        );
    }

    // ── DTO ─────────────────────────────────────────────────────────────────
    // Unchanged shape from before this migration — the frontend contract
    // stays identical.

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
