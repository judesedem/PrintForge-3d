package com.printforge.printforge.fileservice.geometry;

import com.printforge.printforge.fileservice.geometry.TriangleMeshGeometry.GeometryResult;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB.
 *
 * Reuses the same right-angle tetrahedron as StlGeometryParserTest
 * (O=(0,0,0), A=(6,0,0), B=(0,6,0), C=(0,0,6), edge 6mm — volume=0.036cm3,
 * surfaceArea=(54+18*sqrt(3))/100 cm2) so the hand-computed expected values
 * are already verified consistent between both parsers, proving the shared
 * TriangleMeshGeometry math produces identical results regardless of which
 * parser feeds it triangles.
 *
 * Run with: ./mvnw test -Dtest=ObjGeometryParserTest
 */
class ObjGeometryParserTest {

    private final ObjGeometryParser parser = new ObjGeometryParser();

    private static final double TETRAHEDRON_VOLUME_CM3 = 0.036;
    private static final double TETRAHEDRON_SURFACE_AREA_CM2 = (54 + 18 * Math.sqrt(3)) / 100.0;

    private static byte[] bytes(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void parsesAKnownGoodObjWithTriangularFacesToHandComputedValues() {
        // v1=O, v2=A, v3=B, v4=C — faces mirror StlGeometryParserTest's
        // (O,B,A),(O,A,C),(O,C,B),(A,B,C) winding exactly.
        String obj = """
                v 0 0 0
                v 6 0 0
                v 0 6 0
                v 0 0 6
                f 1 3 2
                f 1 2 4
                f 1 4 3
                f 2 3 4
                """;

        GeometryResult result = parser.parse(bytes(obj), "tetrahedron.obj");

        assertTrue(result.parseSucceeded());
        assertEquals(4, result.triangleCount());
        assertEquals(TETRAHEDRON_VOLUME_CM3, result.volumeCm3(), 0.0005);
        assertEquals(TETRAHEDRON_SURFACE_AREA_CM2, result.surfaceAreaCm2(), 0.0005);
        assertEquals(6.0, result.boundingBoxX(), 0.01);
        assertEquals(6.0, result.boundingBoxY(), 0.01);
        assertEquals(6.0, result.boundingBoxZ(), 0.01);
    }

    @Test
    void vtAndVnLinesAndGroupMarkersAreIgnored() {
        String obj = """
                # a comment
                o pyramid_base
                v 0 0 0
                vt 0 0
                v 6 0 0
                vn 0 0 1
                v 0 6 0
                v 0 0 6
                g mesh
                s off
                f 1 3 2
                f 1 2 4
                f 1 4 3
                f 2 3 4
                """;

        GeometryResult result = parser.parse(bytes(obj), "tetrahedron-with-extras.obj");

        assertTrue(result.parseSucceeded());
        assertEquals(4, result.triangleCount());
        assertEquals(TETRAHEDRON_VOLUME_CM3, result.volumeCm3(), 0.0005);
    }

    @Test
    void faceIndexTriplesWithTextureAndNormalReferencesUseOnlyTheVertexIndex() {
        // Same tetrahedron, but every face token carries v/vt/vn or v//vn —
        // the texture/normal indices don't correspond to any real vt/vn
        // lines here, proving they're never resolved/looked up, only the
        // leading vertex index is used.
        String obj = """
                v 0 0 0
                v 6 0 0
                v 0 6 0
                v 0 0 6
                f 1/1/1 3/9/2 2/2/3
                f 1//1 2//2 4//3
                f 1/5 4/6 3/7
                f 2 3 4
                """;

        GeometryResult result = parser.parse(bytes(obj), "tetrahedron-vtvn.obj");

        assertTrue(result.parseSucceeded());
        assertEquals(4, result.triangleCount());
        assertEquals(TETRAHEDRON_VOLUME_CM3, result.volumeCm3(), 0.0005);
        assertEquals(TETRAHEDRON_SURFACE_AREA_CM2, result.surfaceAreaCm2(), 0.0005);
    }

    @Test
    void quadFaceFanTriangulatesToTheSameResultAsTwoExplicitTriangles() {
        // A square-based pyramid: base is one quad face (v1,v2,v3,v4),
        // apex v5. quadObj lets the parser fan-triangulate the base;
        // splitObj declares the exact same base pre-split into the two
        // triangles fan-triangulation is defined to produce
        // ((v1,v2,v3) and (v1,v3,v4)) — same underlying triangles, so the
        // two must come out numerically identical.
        String quadObj = """
                v 0 0 0
                v 4 0 0
                v 4 4 0
                v 0 4 0
                v 2 2 4
                f 1 2 3 4
                f 1 2 5
                f 2 3 5
                f 3 4 5
                f 4 1 5
                """;
        String splitObj = """
                v 0 0 0
                v 4 0 0
                v 4 4 0
                v 0 4 0
                v 2 2 4
                f 1 2 3
                f 1 3 4
                f 1 2 5
                f 2 3 5
                f 3 4 5
                f 4 1 5
                """;

        GeometryResult quadResult = parser.parse(bytes(quadObj), "pyramid-quad.obj");
        GeometryResult splitResult = parser.parse(bytes(splitObj), "pyramid-split.obj");

        assertTrue(quadResult.parseSucceeded());
        assertTrue(splitResult.parseSucceeded());
        assertEquals(splitResult.triangleCount(), quadResult.triangleCount());
        assertEquals(splitResult.volumeCm3(), quadResult.volumeCm3(), 1e-9);
        assertEquals(splitResult.surfaceAreaCm2(), quadResult.surfaceAreaCm2(), 1e-9);
        assertEquals(splitResult.boundingBoxX(), quadResult.boundingBoxX(), 1e-9);
    }

    @Test
    void negativeRelativeIndicesResolveToTheSameResultAsPositiveIndices() {
        // Same tetrahedron/faces as the known-good test above, but every
        // face index expressed relative to the 4 vertices defined so far
        // instead of absolute (f 1 3 2 -> f -4 -2 -3, etc).
        String obj = """
                v 0 0 0
                v 6 0 0
                v 0 6 0
                v 0 0 6
                f -4 -2 -3
                f -4 -3 -1
                f -4 -1 -2
                f -3 -2 -1
                """;

        GeometryResult result = parser.parse(bytes(obj), "tetrahedron-negative.obj");

        assertTrue(result.parseSucceeded());
        assertEquals(4, result.triangleCount());
        assertEquals(TETRAHEDRON_VOLUME_CM3, result.volumeCm3(), 0.0005);
        assertEquals(TETRAHEDRON_SURFACE_AREA_CM2, result.surfaceAreaCm2(), 0.0005);
    }

    @Test
    void faceReferencingOutOfRangeVertexIndexFailsCleanlyWithoutThrowing() {
        String obj = """
                v 0 0 0
                v 6 0 0
                v 0 6 0
                v 0 0 6
                f 1 2 99
                """;

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(bytes(obj), "out-of-range.obj"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void garbageNonNumericFaceTokenFailsCleanlyWithoutThrowing() {
        String obj = """
                v 0 0 0
                v 6 0 0
                v 0 6 0
                v 0 0 6
                f abc def ghi
                """;

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(bytes(obj), "garbage-face.obj"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void completelyRandomGarbageBytesFailCleanlyWithoutThrowing() {
        byte[] garbage = new byte[500];
        for (int i = 0; i < garbage.length; i++) {
            garbage[i] = (byte) (i * 53 + 7);
        }

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(garbage, "garbage.obj"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void emptyFileFailsCleanlyWithoutThrowing() {
        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(new byte[0], "empty.obj"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void tooFewFaceVerticesIsSkippedNotFailed() {
        // A degenerate "f 1 2" (only 2 indices) alongside a valid
        // tetrahedron — the bad face is skipped, not fatal to the parse.
        String obj = """
                v 0 0 0
                v 6 0 0
                v 0 6 0
                v 0 0 6
                f 1 2
                f 1 3 2
                f 1 2 4
                f 1 4 3
                f 2 3 4
                """;

        GeometryResult result = parser.parse(bytes(obj), "degenerate-face.obj");

        assertTrue(result.parseSucceeded());
        assertEquals(4, result.triangleCount());
    }
}
