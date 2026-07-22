package com.printforge.printforge.estimateservice.service;

import com.printforge.printforge.entity.Role;
import com.printforge.printforge.entity.User;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB. Proves the size used in the cost
 * calculation comes from the actual stored file, not a number the client
 * made up, and that bad quality/materialType/fileId are rejected instead
 * of silently falling back to a default.
 *
 * materialRepository is mocked with fixtures matching the exact cost/
 * density/baseMinutesPerGram values MaterialSeeder seeds in production
 * (see config/MaterialSeeder.java) — every test's hardcoded expected
 * number below is unchanged from before the materials-table migration.
 *
 * Run with: ./mvnw test -Dtest=EstimateServiceTest
 */
class EstimateServiceTest {

    EstimateRepository estimateRepository;
    ModelFileRepository modelFileRepository;
    UserRepository userRepository;
    DesignListingRepository listingRepository;
    MaterialRepository materialRepository;
    EstimateService service;

    private static Material material(String name, double costPerGram, double baseMinutesPerGram, double density) {
        Material m = new Material();
        m.setName(name);
        m.setCostPerGram(costPerGram);
        m.setBaseMinutesPerGram(baseMinutesPerGram);
        m.setDensityGCm3(density);
        return m;
    }

    @BeforeEach
    void setUp() {
        estimateRepository = Mockito.mock(EstimateRepository.class);
        modelFileRepository = Mockito.mock(ModelFileRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        listingRepository = Mockito.mock(DesignListingRepository.class);
        materialRepository = Mockito.mock(MaterialRepository.class);
        service = new EstimateService(estimateRepository, modelFileRepository, userRepository, listingRepository,
                materialRepository);

        Mockito.when(estimateRepository.save(Mockito.any(Estimate.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // Unknown material names (e.g. "wood") fall through to empty —
        // exact-name stubs below take precedence for the five real ones.
        Mockito.lenient().when(materialRepository.findByName(Mockito.anyString())).thenReturn(Optional.empty());
        Mockito.lenient().when(materialRepository.findByName("PLA"))
                .thenReturn(Optional.of(material("PLA", 0.05, 2.5, 1.24)));
        Mockito.lenient().when(materialRepository.findByName("RESIN"))
                .thenReturn(Optional.of(material("RESIN", 0.15, 4.0, 1.10)));
        Mockito.lenient().when(materialRepository.findByName("ABS"))
                .thenReturn(Optional.of(material("ABS", 0.08, 2.8, 1.04)));
        Mockito.lenient().when(materialRepository.findByName("PETG"))
                .thenReturn(Optional.of(material("PETG", 0.12, 2.5, 1.27)));
        Mockito.lenient().when(materialRepository.findByName("CARBON_FIBER"))
                .thenReturn(Optional.of(material("CARBON_FIBER", 0.25, 2.5, 1.30)));
        Mockito.lenient().when(materialRepository.findAll()).thenReturn(List.of());

        // Default: requester is a STUDENT who owns file ID 1
        User student = new User();
        student.setUserId(7L);
        student.setRole(Role.STUDENT);
        Mockito.when(userRepository.findById(7L)).thenReturn(Optional.of(student));
    }

    private ModelFile fileOfSize(long bytes) {
        ModelFile file = new ModelFile();
        file.setFileId(1L);
        file.setUserId(7L); // same as requester — ownership check passes
        file.setFileSizeBytes(bytes);
        return file;
    }

    /** Same as fileOfSize(), plus parsed STL geometry — geometryParsed defaults false otherwise. */
    private ModelFile fileWithGeometry(long bytes, double volumeCm3, double surfaceAreaCm2) {
        ModelFile file = fileOfSize(bytes);
        file.setGeometryParsed(true);
        file.setVolumeCm3(volumeCm3);
        file.setSurfaceAreaCm2(surfaceAreaCm2);
        return file;
    }

    /** Same as fileOfSize(), plus a gcode pre-sliced weight/duration (either may be null) — preSliced defaults false otherwise. */
    private ModelFile fileWithPreSliced(long bytes, Double weightGrams, Double durationMinutes) {
        ModelFile file = fileOfSize(bytes);
        file.setPreSliced(true);
        file.setPreSlicedWeightGrams(weightGrams);
        file.setPreSlicedDurationMinutes(durationMinutes);
        return file;
    }

    @Test
    void rejectsUnknownFileId() {
        Mockito.when(modelFileRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ModelFileNotFoundException.class,
                () -> service.calculateAndSaveEstimate(99L, "STANDARD", 20, 1, "PLA", 7L));
    }

    @Test
    void rejectsUnknownQuality() {
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(fileOfSize(102400)));

        assertThrows(InvalidEstimateInputException.class,
                () -> service.calculateAndSaveEstimate(1L, "ultra-mega-quality", 20, 1, "PLA", 7L));
    }

    @Test
    void rejectsUnknownMaterial() {
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(fileOfSize(102400)));

        assertThrows(InvalidEstimateInputException.class,
                () -> service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "wood", 7L));
    }

    @Test
    void derivesFileSizeFromTheActualStoredFileNotAClientNumber() {
        // 102400 bytes == 100 KB exactly
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(fileOfSize(102400)));

        Estimate result = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PLA", 7L);

        assertEquals(100.0, result.getFileSizeKb(), 0.001);
        assertEquals(1L, result.getFileId());
        assertEquals(7L, result.getUserId());
        assertEquals("PLA", result.getMaterialType());
        assertEquals("STANDARD", result.getQuality());
        assertTrue(result.getTotalCost() > 0);
    }

    @Test
    void fallsBackToFileSizeHeuristicWhenGeometryNotParsed() {
        // 102400 bytes == 100 KB exactly — geometryParsed defaults false
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(fileOfSize(102400)));

        Estimate result = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PLA", 7L);

        // Unchanged old formula: fileSizeKb * 0.8 = 100 * 0.8 = 80
        assertEquals(80.0, result.getEstimatedGrams(), 0.001);
    }

    @Test
    void usesRealGeometryWhenParsed() {
        // volumeCm3=10, surfaceAreaCm2=20, wallThicknessMm=1.2, infill=20%, PLA (density 1.24):
        //   shellVolumeCm3 = (20 * 1.2) / 10 = 2.4
        //   interiorVolumeCm3 = max(10 - 2.4, 0) = 7.6
        //   infillVolumeCm3 = 7.6 * 0.20 = 1.52
        //   totalPrintVolumeCm3 = 2.4 + 1.52 = 3.92
        //   estimatedGrams = 3.92 * 1.24 = 4.8608
        Mockito.when(modelFileRepository.findById(1L))
                .thenReturn(Optional.of(fileWithGeometry(102400, 10.0, 20.0)));

        Estimate result = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PLA", 7L);

        assertEquals(4.8608, result.getEstimatedGrams(), 0.0005);
    }

    @Test
    void geometryShellVolumeNeverExceedsTotalVolumeRegardlessOfSurfaceArea() {
        // A pathological case: surfaceAreaCm2 so large relative to volume
        // that the raw shell estimate alone would exceed the whole
        // object's volume. estimatedGrams must still come out bounded by
        // volumeCm3 * density (i.e. as if the whole object were solid),
        // never more.
        // volumeCm3=1, surfaceAreaCm2=1000 -> shellVolumeCm3 raw = (1000*1.2)/10 = 120
        //   interiorVolumeCm3 = max(1 - 120, 0) = 0 -> infillVolumeCm3 = 0
        //   shellVolumeCm3 clamped = min(120, 1) = 1
        //   totalPrintVolumeCm3 = 1 + 0 = 1 -> estimatedGrams = 1 * 1.24 = 1.24
        Mockito.when(modelFileRepository.findById(1L))
                .thenReturn(Optional.of(fileWithGeometry(102400, 1.0, 1000.0)));

        Estimate result = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PLA", 7L);

        assertEquals(1.24, result.getEstimatedGrams(), 0.0005);
    }

    @Test
    void geometryFormulaUsesMaterialDensity() {
        // Same geometry as usesRealGeometryWhenParsed() (totalPrintVolumeCm3=3.92)
        // but RESIN (density 1.10) instead of PLA (1.24): 3.92 * 1.10 = 4.312
        Mockito.when(modelFileRepository.findById(1L))
                .thenReturn(Optional.of(fileWithGeometry(102400, 10.0, 20.0)));

        Estimate result = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "RESIN", 7L);

        assertEquals(4.312, result.getEstimatedGrams(), 0.0005);
    }

    @Test
    void petgProducesAValidCostGreaterThanTheEquivalentPlaJob() {
        // Same geometry as usesRealGeometryWhenParsed() (totalPrintVolumeCm3=3.92)
        // -> PETG (density 1.27): estimatedGrams = 3.92 * 1.27 = 4.9784
        Mockito.when(modelFileRepository.findById(1L))
                .thenReturn(Optional.of(fileWithGeometry(102400, 10.0, 20.0)));

        Estimate plaResult = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PLA", 7L);
        Estimate petgResult = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PETG", 7L);

        assertEquals(4.9784, petgResult.getEstimatedGrams(), 0.0005);
        assertFalse(Double.isNaN(petgResult.getTotalCost()));
        assertTrue(petgResult.getTotalCost() > 0);
        assertTrue(petgResult.getTotalCost() > plaResult.getTotalCost(),
                "PETG (GH₵0.12/g) costs more per gram than PLA (GH₵0.05/g), so the same geometry must cost more");
    }

    @Test
    void carbonFiberProducesAValidCostGreaterThanTheEquivalentPlaJob() {
        // Same geometry as usesRealGeometryWhenParsed() (totalPrintVolumeCm3=3.92)
        // -> CARBON_FIBER (density 1.30): estimatedGrams = 3.92 * 1.30 = 5.096
        Mockito.when(modelFileRepository.findById(1L))
                .thenReturn(Optional.of(fileWithGeometry(102400, 10.0, 20.0)));

        Estimate plaResult = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PLA", 7L);
        Estimate carbonFiberResult = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "CARBON_FIBER", 7L);

        assertEquals(5.096, carbonFiberResult.getEstimatedGrams(), 0.0005);
        assertFalse(Double.isNaN(carbonFiberResult.getTotalCost()));
        assertTrue(carbonFiberResult.getTotalCost() > 0);
        assertTrue(carbonFiberResult.getTotalCost() > plaResult.getTotalCost(),
                "Carbon fiber (GH₵0.25/g) costs more per gram than PLA (GH₵0.05/g), so the same geometry must cost more");
    }

    @Test
    void preSlicedWeightAndDurationAreBothUsedDirectlyWhenPresent() {
        Mockito.when(modelFileRepository.findById(1L))
                .thenReturn(Optional.of(fileWithPreSliced(102400, 50.0, 120.0)));

        Estimate result = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PLA", 7L);

        assertEquals(50.0, result.getEstimatedGrams(), 0.001,
                "preSlicedWeightGrams should be used as-is, no formula applied");
        assertEquals(120.0, result.getDurationMinutes(), 0.001,
                "preSlicedDurationMinutes should be used as-is, no formula applied");
    }

    @Test
    void preSlicedWeightOnlyFallsThroughToTheDurationFormula() {
        // preSlicedDurationMinutes is null — duration must still be
        // computed via the normal formula, using the pre-sliced weight
        // as estimatedGrams: 2.5 (PLA) * 50 * 1.0 (STANDARD) * 0.7 (20% infill) * 1 (qty) = 87.5
        Mockito.when(modelFileRepository.findById(1L))
                .thenReturn(Optional.of(fileWithPreSliced(102400, 50.0, null)));

        Estimate result = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PLA", 7L);

        assertEquals(50.0, result.getEstimatedGrams(), 0.001);
        assertEquals(87.5, result.getDurationMinutes(), 0.001);
    }

    @Test
    void preSlicedDurationOnlyFallsThroughToTheFileSizeHeuristicForWeight() {
        // preSlicedWeightGrams is null and geometryParsed is unset on this
        // file — estimatedGrams must fall all the way through to the old
        // file-size heuristic (100KB * 0.8 = 80), while durationMinutes
        // still comes directly from the pre-sliced value.
        Mockito.when(modelFileRepository.findById(1L))
                .thenReturn(Optional.of(fileWithPreSliced(102400, null, 45.0)));

        Estimate result = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PLA", 7L);

        assertEquals(80.0, result.getEstimatedGrams(), 0.001);
        assertEquals(45.0, result.getDurationMinutes(), 0.001);
    }

    @Test
    void preSlicedWeightTakesPriorityOverGeometryParsedWhenBothArePresent() {
        // Same file has both a pre-sliced weight AND parsed STL geometry
        // (e.g. re-processed some other way) — pre-sliced must win; the
        // geometry-based shell/infill formula must not run at all.
        ModelFile file = fileWithGeometry(102400, 10.0, 20.0); // would otherwise yield 4.8608g, see usesRealGeometryWhenParsed()
        file.setPreSliced(true);
        file.setPreSlicedWeightGrams(99.0);
        Mockito.when(modelFileRepository.findById(1L)).thenReturn(Optional.of(file));

        Estimate result = service.calculateAndSaveEstimate(1L, "STANDARD", 20, 1, "PLA", 7L);

        assertEquals(99.0, result.getEstimatedGrams(), 0.001);
    }

    @Test
    void getEstimateByIdThrowsNotFoundForUnknownId() {
        Mockito.when(estimateRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(EstimateNotFoundException.class, () -> service.getEstimateById(404L));
    }
}
