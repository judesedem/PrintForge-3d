package com.printforge.printforge.materialservice.service;

import com.printforge.printforge.materialservice.dto.UpdateMaterialRequest;
import com.printforge.printforge.materialservice.exception.MaterialNotFoundException;
import com.printforge.printforge.materialservice.model.Material;
import com.printforge.printforge.materialservice.repository.MaterialRepository;
import org.springframework.stereotype.Service;

@Service
public class MaterialService {

    private final MaterialRepository materialRepository;

    public MaterialService(MaterialRepository materialRepository) {
        this.materialRepository = materialRepository;
    }

    /**
     * PATCH /api/admin/materials/{name} — updates cost_per_gram/colors/
     * availability_status only (baseMinutesPerGram/density stay fixed at
     * their seeded values). Writes to the same `materials` table
     * EstimateService reads its cost/time formula from, so the very next
     * estimate calculated for this material reflects the change —
     * there's no second copy of the price left stale anywhere.
     */
    public Material updateMaterial(String name, UpdateMaterialRequest request) {
        String normalized = name == null ? "" : name.trim().toUpperCase();
        Material material = materialRepository.findByName(normalized)
                .orElseThrow(() -> new MaterialNotFoundException(normalized));

        if (request.getCostPerGram() != null) material.setCostPerGram(request.getCostPerGram());
        if (request.getColors() != null) material.setColors(request.getColors());
        if (request.getAvailabilityStatus() != null) material.setAvailabilityStatus(request.getAvailabilityStatus());

        return materialRepository.save(material);
    }
}
