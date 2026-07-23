package com.printforge.admin.materialservice.service;

import com.printforge.admin.materialservice.dto.UpdateMaterialRequest;
import com.printforge.admin.materialservice.exception.MaterialNotFoundException;
import com.printforge.admin.materialservice.model.Material;
import com.printforge.admin.materialservice.repository.MaterialRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Ported from the monolith's
 * MaterialServiceTest.
 *
 * Run with: ./mvnw -pl admin-service test -Dtest=MaterialServiceTest
 */
class MaterialServiceTest {

    MaterialRepository materialRepository;
    MaterialService service;

    @BeforeEach
    void setUp() {
        materialRepository = Mockito.mock(MaterialRepository.class);
        service = new MaterialService(materialRepository);
    }

    private Material existingPla() {
        Material material = new Material();
        material.setId(1L);
        material.setName("PLA");
        material.setCostPerGram(0.05);
        material.setBaseMinutesPerGram(2.5);
        material.setDensityGCm3(1.24);
        material.setColors(List.of("White", "Black"));
        material.setAvailabilityStatus("available");
        material.setDescription("Standard thermoplastic.");
        return material;
    }

    @Test
    void updateMaterialOnlyChangesProvidedFields() {
        Mockito.when(materialRepository.findByName("PLA")).thenReturn(Optional.of(existingPla()));
        Mockito.when(materialRepository.save(Mockito.any(Material.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        UpdateMaterialRequest request = new UpdateMaterialRequest();
        request.setCostPerGram(0.07);
        // colors/availabilityStatus left null — should stay unchanged

        Material updated = service.updateMaterial("PLA", request);

        assertEquals(0.07, updated.getCostPerGram(), 0.0001);
        assertEquals(List.of("White", "Black"), updated.getColors());
        assertEquals("available", updated.getAvailabilityStatus());
        // Fields outside the PATCH surface never change
        assertEquals(2.5, updated.getBaseMinutesPerGram(), 0.0001);
        assertEquals(1.24, updated.getDensityGCm3(), 0.0001);
    }

    @Test
    void updateMaterialNormalizesTheNameCaseInsensitively() {
        Mockito.when(materialRepository.findByName("PLA")).thenReturn(Optional.of(existingPla()));
        Mockito.when(materialRepository.save(Mockito.any(Material.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        UpdateMaterialRequest request = new UpdateMaterialRequest();
        request.setAvailabilityStatus("low");

        Material updated = service.updateMaterial("pla", request);

        assertEquals("low", updated.getAvailabilityStatus());
        Mockito.verify(materialRepository).findByName("PLA");
    }

    @Test
    void updateMaterialCanReplaceColors() {
        Mockito.when(materialRepository.findByName("PLA")).thenReturn(Optional.of(existingPla()));
        Mockito.when(materialRepository.save(Mockito.any(Material.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        UpdateMaterialRequest request = new UpdateMaterialRequest();
        request.setColors(List.of("Purple", "Glow-in-the-dark"));

        Material updated = service.updateMaterial("PLA", request);

        assertEquals(List.of("Purple", "Glow-in-the-dark"), updated.getColors());
    }

    @Test
    void updateMaterialRejectsAnUnknownName() {
        Mockito.when(materialRepository.findByName("TITANIUM")).thenReturn(Optional.empty());

        UpdateMaterialRequest request = new UpdateMaterialRequest();
        request.setCostPerGram(1.00);

        assertThrows(MaterialNotFoundException.class, () -> service.updateMaterial("TITANIUM", request));
    }
}
