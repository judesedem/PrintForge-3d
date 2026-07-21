package com.printforge.printforge.fileservice.geometry;

import com.printforge.printforge.fileservice.geometry.TriangleMeshGeometry.GeometryResult;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB.
 *
 * Reuses the same right-angle tetrahedron as the other geometry parser
 * tests (O=(0,0,0), A=(6,0,0), B=(0,6,0), C=(0,0,6), edge 6mm —
 * volume=0.036cm3, surfaceArea=(54+18*sqrt(3))/100 cm2). Both the ASCII
 * and binary encodings below declare the identical mesh (same vertex
 * order, same face winding), so both must parse to the same values —
 * proving the header-driven property/index handling is correct for both
 * body encodings, not just one.
 *
 * Run with: ./mvnw test -Dtest=PlyGeometryParserTest
 */
class PlyGeometryParserTest {

    private final PlyGeometryParser parser = new PlyGeometryParser();

    private static final double TETRAHEDRON_VOLUME_CM3 = 0.036;
    private static final double TETRAHEDRON_SURFACE_AREA_CM2 = (54 + 18 * Math.sqrt(3)) / 100.0;

    private static final float[] O = {0, 0, 0};
    private static final float[] A = {6, 0, 0};
    private static final float[] B = {0, 6, 0};
    private static final float[] C = {0, 0, 6};
    private static final float[][] VERTICES = {O, A, B, C};
    // 0-indexed faces mirroring the STL/OBJ/3MF/AMF tests' (O,B,A),(O,A,C),(O,C,B),(A,B,C) winding.
    private static final int[][] FACES = {{0, 2, 1}, {0, 1, 3}, {0, 3, 2}, {1, 2, 3}};

    private static String header(String format) {
        return """
                ply
                format %s 1.0
                element vertex 4
                property float x
                property float y
                property float z
                element face 4
                property list uchar int vertex_indices
                end_header
                """.formatted(format);
    }

    private static byte[] buildAsciiPly() {
        StringBuilder sb = new StringBuilder(header("ascii"));
        for (float[] v : VERTICES) {
            sb.append(v[0]).append(' ').append(v[1]).append(' ').append(v[2]).append('\n');
        }
        for (int[] face : FACES) {
            sb.append("3 ").append(face[0]).append(' ').append(face[1]).append(' ').append(face[2]).append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.US_ASCII);
    }

    private static byte[] buildBinaryPly() throws Exception {
        byte[] headerBytes = header("binary_little_endian").getBytes(StandardCharsets.US_ASCII);

        ByteArrayOutputStream body = new ByteArrayOutputStream();
        ByteBuffer vertexBuf = ByteBuffer.allocate(VERTICES.length * 12).order(ByteOrder.LITTLE_ENDIAN);
        for (float[] v : VERTICES) {
            vertexBuf.putFloat(v[0]).putFloat(v[1]).putFloat(v[2]);
        }
        body.write(vertexBuf.array());

        ByteBuffer faceBuf = ByteBuffer.allocate(FACES.length * (1 + 3 * 4)).order(ByteOrder.LITTLE_ENDIAN);
        for (int[] face : FACES) {
            faceBuf.put((byte) 3);
            faceBuf.putInt(face[0]).putInt(face[1]).putInt(face[2]);
        }
        body.write(faceBuf.array());

        ByteArrayOutputStream full = new ByteArrayOutputStream();
        full.write(headerBytes);
        full.write(body.toByteArray());
        return full.toByteArray();
    }

    @Test
    void parsesAKnownGoodAsciiPlyTetrahedronToHandComputedValues() {
        GeometryResult result = parser.parse(buildAsciiPly(), "tetrahedron-ascii.ply");

        assertTrue(result.parseSucceeded());
        assertEquals(4, result.triangleCount());
        assertEquals(TETRAHEDRON_VOLUME_CM3, result.volumeCm3(), 0.0005);
        assertEquals(TETRAHEDRON_SURFACE_AREA_CM2, result.surfaceAreaCm2(), 0.0005);
        assertEquals(6.0, result.boundingBoxX(), 0.01);
    }

    @Test
    void parsesAKnownGoodBinaryPlyTetrahedronToHandComputedValues() throws Exception {
        GeometryResult result = parser.parse(buildBinaryPly(), "tetrahedron-binary.ply");

        assertTrue(result.parseSucceeded());
        assertEquals(4, result.triangleCount());
        assertEquals(TETRAHEDRON_VOLUME_CM3, result.volumeCm3(), 0.0005);
        assertEquals(TETRAHEDRON_SURFACE_AREA_CM2, result.surfaceAreaCm2(), 0.0005);
        assertEquals(6.0, result.boundingBoxX(), 0.01);
    }

    @Test
    void asciiAndBinaryEncodingsOfTheSameMeshProduceTheSameVolume() throws Exception {
        GeometryResult asciiResult = parser.parse(buildAsciiPly(), "ascii.ply");
        GeometryResult binaryResult = parser.parse(buildBinaryPly(), "binary.ply");

        assertTrue(asciiResult.parseSucceeded());
        assertTrue(binaryResult.parseSucceeded());
        assertEquals(asciiResult.volumeCm3(), binaryResult.volumeCm3(), 1e-9);
        assertEquals(asciiResult.surfaceAreaCm2(), binaryResult.surfaceAreaCm2(), 1e-9);
        assertEquals(asciiResult.triangleCount(), binaryResult.triangleCount());
    }

    @Test
    void unrecognizedFacePropertyTypeFailsCleanlyWithoutThrowing() {
        // "property float vertex_indices" instead of a list type — not a
        // format this parser is willing to guess at.
        String malformedHeader = """
                ply
                format ascii 1.0
                element vertex 4
                property float x
                property float y
                property float z
                element face 4
                property float vertex_indices
                end_header
                """;
        StringBuilder sb = new StringBuilder(malformedHeader);
        for (float[] v : VERTICES) {
            sb.append(v[0]).append(' ').append(v[1]).append(' ').append(v[2]).append('\n');
        }

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(sb.toString().getBytes(StandardCharsets.US_ASCII), "bad-face-property.ply"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void missingEndHeaderFailsCleanlyWithoutThrowing() {
        byte[] noEndHeader = """
                ply
                format ascii 1.0
                element vertex 4
                property float x
                property float y
                property float z
                """.getBytes(StandardCharsets.US_ASCII);

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(noEndHeader, "no-end-header.ply"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void faceReferencingOutOfRangeVertexIndexFailsCleanlyWithoutThrowing() {
        // header declares only 1 face (matching the single face line
        // below) referencing an out-of-range index — exercises the
        // out-of-range check directly rather than running out of lines.
        String badPly = header("ascii").replace("element face 4", "element face 1")
                + "0 0 0\n6 0 0\n0 6 0\n0 0 6\n3 0 1 99\n";

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(badPly.getBytes(StandardCharsets.US_ASCII), "out-of-range.ply"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void randomGarbageBytesFailCleanlyWithoutThrowing() {
        byte[] garbage = new byte[500];
        for (int i = 0; i < garbage.length; i++) {
            garbage[i] = (byte) (i * 41 + 3);
        }

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(garbage, "garbage.ply"));

        assertFalse(result.parseSucceeded());
    }
}
