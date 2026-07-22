package com.printforge.marketplace.fileservice.geometry;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts an ALREADY-SLICED weight/print-time directly from slicer
 * comment lines in a G-code file — unlike the other four parsers, this
 * doesn't compute geometry at all (the file is already sliced, there's no
 * mesh left to measure), so it returns a separate result shape
 * (weightGrams/durationMinutes) rather than forcing itself into
 * TriangleMeshGeometry.GeometryResult.
 *
 * Tries each known slicer comment pattern in order until one matches.
 * Never throws — no match anywhere in the file, or any parse exception,
 * comes back as GCodeResult.failed() so the upload falls back to the
 * existing file-size heuristic, same as any other unparseable file.
 *
 * Known limitation, not an oversight: material isn't actually known at
 * upload time (FileStorageService.store() runs before the customer picks
 * a material for their estimate) — the mm/m-length -&gt; weight conversion
 * below needs a density, so it defaults to PLA when no material is
 * supplied. If the customer later requests an estimate in RESIN/ABS, the
 * pre-sliced weight stays PLA-based rather than being re-derived — the
 * parser accepts a materialType parameter (used directly by tests to
 * verify the conversion for each material) so this isn't a hard
 * limitation of the parsing logic itself, just of the one production call
 * site's timing.
 */
@Slf4j
@Component
public class GCodeWeightParser {

    private static final double DEFAULT_FILAMENT_DIAMETER_MM = 1.75;
    private static final double PLA_DENSITY_G_CM3 = 1.24;
    private static final double RESIN_DENSITY_G_CM3 = 1.10;
    private static final double ABS_DENSITY_G_CM3 = 1.04;

    private static final Pattern PRUSA_WEIGHT_GRAMS = Pattern.compile("filament used \\[g]\\s*=\\s*([\\d.]+)");
    private static final Pattern PRUSA_WEIGHT_MM = Pattern.compile("filament used \\[mm]\\s*=\\s*([\\d.]+)");
    private static final Pattern CURA_WEIGHT_METERS = Pattern.compile("Filament used:\\s*([\\d.]+)m");
    private static final Pattern PRUSA_TIME = Pattern.compile(
            "estimated printing time\\s*=\\s*(?:(\\d+)h\\s*)?(?:(\\d+)m\\s*)?(?:(\\d+)s)?");
    private static final Pattern CURA_TIME = Pattern.compile(";TIME:\\s*(\\d+)");

    public record GCodeResult(Double weightGrams, Double durationMinutes, boolean parseSucceeded) {
        public static GCodeResult failed() {
            return new GCodeResult(null, null, false);
        }
    }

    /**
     * @param bytes        raw file bytes
     * @param fileName     original filename, used only for warning-log context
     * @param materialType caller's material choice, if known (nullable — defaults to PLA density for the length-based conversion; irrelevant when a direct [g] weight line is found)
     */
    public GCodeResult parse(byte[] bytes, String fileName, String materialType) {
        try {
            String text = new String(bytes, StandardCharsets.UTF_8);

            Double weightGrams = extractWeightGrams(text, materialType);
            Double durationMinutes = extractDurationMinutes(text);

            if (weightGrams == null && durationMinutes == null) {
                return GCodeResult.failed();
            }
            return new GCodeResult(weightGrams, durationMinutes, true);
        } catch (Exception e) {
            log.warn("Failed to parse gcode weight/time for file '{}': {}", fileName, e.getMessage());
            return GCodeResult.failed();
        }
    }

    private Double extractWeightGrams(String text, String materialType) {
        Matcher gramsMatcher = PRUSA_WEIGHT_GRAMS.matcher(text);
        if (gramsMatcher.find()) {
            return Double.parseDouble(gramsMatcher.group(1));
        }

        Matcher mmMatcher = PRUSA_WEIGHT_MM.matcher(text);
        if (mmMatcher.find()) {
            return weightFromFilamentLengthMm(Double.parseDouble(mmMatcher.group(1)), materialType);
        }

        Matcher curaMatcher = CURA_WEIGHT_METERS.matcher(text);
        if (curaMatcher.find()) {
            double lengthMm = Double.parseDouble(curaMatcher.group(1)) * 1000.0;
            return weightFromFilamentLengthMm(lengthMm, materialType);
        }

        return null;
    }

    private double weightFromFilamentLengthMm(double lengthMm, String materialType) {
        double radiusCm = (DEFAULT_FILAMENT_DIAMETER_MM / 10.0) / 2.0;
        double volumeCm3 = Math.PI * radiusCm * radiusCm * (lengthMm / 10.0);
        return volumeCm3 * densityForMaterial(materialType);
    }

    private double densityForMaterial(String materialType) {
        if (materialType == null) return PLA_DENSITY_G_CM3;
        String normalized = materialType.trim().toUpperCase();
        return switch (normalized) {
            case "RESIN" -> RESIN_DENSITY_G_CM3;
            case "ABS" -> ABS_DENSITY_G_CM3;
            default -> PLA_DENSITY_G_CM3;
        };
    }

    private Double extractDurationMinutes(String text) {
        Matcher prusaMatcher = PRUSA_TIME.matcher(text);
        if (prusaMatcher.find()
                && (prusaMatcher.group(1) != null || prusaMatcher.group(2) != null || prusaMatcher.group(3) != null)) {
            int hours = prusaMatcher.group(1) != null ? Integer.parseInt(prusaMatcher.group(1)) : 0;
            int minutes = prusaMatcher.group(2) != null ? Integer.parseInt(prusaMatcher.group(2)) : 0;
            int seconds = prusaMatcher.group(3) != null ? Integer.parseInt(prusaMatcher.group(3)) : 0;
            return hours * 60.0 + minutes + seconds / 60.0;
        }

        Matcher curaMatcher = CURA_TIME.matcher(text);
        if (curaMatcher.find()) {
            return Double.parseDouble(curaMatcher.group(1)) / 60.0;
        }

        return null;
    }
}
