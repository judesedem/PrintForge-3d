package com.printforge.printforge.fileservice.geometry;

import com.printforge.printforge.fileservice.geometry.TriangleMeshGeometry.GeometryResult;
import org.junit.jupiter.api.Test;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB.
 *
 * Uses a right-angle tetrahedron (vertices at the origin and along each
 * axis) as the known-good test shape rather than an external fixture file
 * — its volume/surface area are hand-computable exactly, and the standard
 * "sum of v1.(v2 x v3)/6 over consistently-wound faces = enclosed volume"
 * identity (which the prompt's signedVolume formula is algebraically
 * equivalent to) guarantees the parser's output should match those
 * hand-computed values precisely, not approximately.
 *
 * Tetrahedron: O=(0,0,0), A=(6,0,0), B=(0,6,0), C=(0,0,6), edge length 6mm.
 *   volume = edge^3 / 6 = 216/6 = 36 mm^3 = 0.036 cm^3
 *   surface area = 3 right-triangle faces (0.5*6*6=18mm^2 each) + 1
 *                  equilateral face (side 6*sqrt(2), area (sqrt(3)/4)*72
 *                  = 18*sqrt(3) mm^2)
 *                = 54 + 18*sqrt(3) ~= 85.177 mm^2 ~= 0.85177 cm^2
 *   bounding box = 6 x 6 x 6 mm
 *
 * Run with: ./mvnw test -Dtest=StlGeometryParserTest
 */
class StlGeometryParserTest {

    private final StlGeometryParser parser = new StlGeometryParser();

    private static final float[] O = {0, 0, 0};
    private static final float[] A = {6, 0, 0};
    private static final float[] B = {0, 6, 0};
    private static final float[] C = {0, 0, 6};

    // Outward-wound (right-hand rule) faces of the tetrahedron above.
    private static final float[][][] TETRAHEDRON_FACES = {
            {O, B, A},
            {O, A, C},
            {O, C, B},
            {A, B, C},
    };

    /** Builds a valid binary STL: 80-byte header + 4-byte LE triangle count + 50 bytes/triangle. */
    private static byte[] buildBinaryStl(float[][][] faces) {
        int triangleCount = faces.length;
        ByteBuffer buf = ByteBuffer.allocate(84 + triangleCount * 50).order(ByteOrder.LITTLE_ENDIAN);
        buf.put(new byte[80]); // header, contents irrelevant
        buf.putInt(triangleCount);

        for (float[][] face : faces) {
            buf.putFloat(0).putFloat(0).putFloat(0); // normal — ignored by the parser
            for (float[] vertex : face) {
                buf.putFloat(vertex[0]).putFloat(vertex[1]).putFloat(vertex[2]);
            }
            buf.putShort((short) 0); // attribute byte count
        }

        return buf.array();
    }

    @Test
    void parsesAKnownGoodBinaryTetrahedronToHandComputedValues() {
        byte[] stl = buildBinaryStl(TETRAHEDRON_FACES);

        GeometryResult result = parser.parse(stl, "tetrahedron.stl");

        assertTrue(result.parseSucceeded());
        assertEquals(4, result.triangleCount());
        assertEquals(0.036, result.volumeCm3(), 0.0005);
        assertEquals((54 + 18 * Math.sqrt(3)) / 100.0, result.surfaceAreaCm2(), 0.0005);
        assertEquals(6.0, result.boundingBoxX(), 0.01);
        assertEquals(6.0, result.boundingBoxY(), 0.01);
        assertEquals(6.0, result.boundingBoxZ(), 0.01);
    }

    @Test
    void parsesAnAsciiTetrahedronToTheSameValuesAsBinary() {
        StringBuilder sb = new StringBuilder("solid tetrahedron\n");
        for (float[][] face : TETRAHEDRON_FACES) {
            sb.append("facet normal 0 0 0\n outer loop\n");
            for (float[] v : face) {
                sb.append("  vertex ").append(v[0]).append(' ').append(v[1]).append(' ').append(v[2]).append('\n');
            }
            sb.append(" endloop\nendfacet\n");
        }
        sb.append("endsolid tetrahedron\n");
        byte[] stl = sb.toString().getBytes(StandardCharsets.UTF_8);

        GeometryResult result = parser.parse(stl, "tetrahedron.stl");

        assertTrue(result.parseSucceeded());
        assertEquals(4, result.triangleCount());
        assertEquals(0.036, result.volumeCm3(), 0.0005);
        assertEquals((54 + 18 * Math.sqrt(3)) / 100.0, result.surfaceAreaCm2(), 0.0005);
    }

    @Test
    void truncatedFileFailsCleanlyWithoutThrowing() {
        byte[] goodStl = buildBinaryStl(TETRAHEDRON_FACES);
        byte[] truncated = Arrays.copyOf(goodStl, goodStl.length - 20);

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(truncated, "truncated.stl"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void randomGarbageBytesFailCleanlyWithoutThrowing() {
        byte[] garbage = new byte[500];
        for (int i = 0; i < garbage.length; i++) {
            garbage[i] = (byte) (i * 37 + 11); // deterministic non-STL noise
        }

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(garbage, "garbage.stl"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void triangleCountMismatchedWithFileLengthFallsThroughToAsciiOrFailsCleanly() {
        // Header declares 10 triangles (84 + 10*50 = 584 bytes expected),
        // but the buffer is only 84 + 2*50 = 184 bytes — the length check
        // fails, so this must fall through to an ASCII attempt rather than
        // reading 10 triangles' worth of binary data out of a too-short array.
        ByteBuffer buf = ByteBuffer.allocate(84 + 2 * 50).order(ByteOrder.LITTLE_ENDIAN);
        buf.put(new byte[80]);
        buf.putInt(10); // lies about the triangle count
        for (int i = 0; i < 2; i++) {
            buf.putFloat(0).putFloat(0).putFloat(0);
            buf.putFloat(1).putFloat(0).putFloat(0);
            buf.putFloat(0).putFloat(1).putFloat(0);
            buf.putFloat(0).putFloat(0).putFloat(1);
            buf.putShort((short) 0);
        }

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(buf.array(), "mismatched-count.stl"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void emptyFileFailsCleanlyWithoutThrowing() {
        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(new byte[0], "empty.stl"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void declaredTriangleCountAboveCapIsRejectedWithoutAttemptingToParse() {
        // The cap check only fires once the length-match test recognizes
        // the file as genuinely binary (bytes.length == 84 + N*50) — so
        // proving it actually engages, rather than the file just falling
        // through to a failed ASCII attempt for an unrelated reason,
        // requires a real array of that exact size for N just over the
        // cap. Left zero-filled (the JVM does this for free) except for
        // the header's declared count — the point is this must be
        // rejected on the count check before ever touching the ~2M
        // "triangles" of (zeroed) data.
        long overCapCount = 2_000_001L;
        int totalLength = (int) (84 + overCapCount * 50);
        byte[] bytes = new byte[totalLength];
        ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).putInt(80, (int) overCapCount);

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(bytes, "huge.stl"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void degenerateFlatMeshFailsValidation() {
        // 4 coplanar (flat, zero-volume) triangles in the z=0 plane —
        // enough triangles to pass the count check, but volume must come
        // out to (near) zero, which should fail validation.
        float[] p1 = {0, 0, 0}, p2 = {1, 0, 0}, p3 = {1, 1, 0}, p4 = {0, 1, 0};
        float[][][] flatFaces = {
                {p1, p2, p3}, {p1, p3, p4}, {p1, p2, p4}, {p2, p3, p4}
        };
        byte[] stl = buildBinaryStl(flatFaces);

        GeometryResult result = parser.parse(stl, "flat.stl");

        assertFalse(result.parseSucceeded());
    }
}
