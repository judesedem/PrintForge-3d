package com.printforge.printforge.fileservice.geometry;

import com.printforge.printforge.fileservice.geometry.TriangleMeshGeometry.GeometryResult;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB.
 *
 * Reuses the same right-angle tetrahedron as the other geometry parser
 * tests (O=(0,0,0), A=(6,0,0), B=(0,6,0), C=(0,0,6), edge 6mm —
 * volume=0.036cm3, surfaceArea=(54+18*sqrt(3))/100 cm2), expressed as AMF
 * XML — proving the shared TriangleMeshGeometry math produces identical
 * results regardless of format.
 *
 * Run with: ./mvnw test -Dtest=AmfGeometryParserTest
 */
class AmfGeometryParserTest {

    private final AmfGeometryParser parser = new AmfGeometryParser();

    private static final double TETRAHEDRON_VOLUME_CM3 = 0.036;
    private static final double TETRAHEDRON_SURFACE_AREA_CM2 = (54 + 18 * Math.sqrt(3)) / 100.0;

    private static byte[] bytes(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }

    /** One <object> containing the tetrahedron (0-indexed, same winding as the STL/OBJ/3MF tests). */
    private static String tetrahedronObject(String objectId) {
        return """
                <object id="%s">
                  <mesh>
                    <vertices>
                      <vertex><coordinates><x>0</x><y>0</y><z>0</z></coordinates></vertex>
                      <vertex><coordinates><x>6</x><y>0</y><z>0</z></coordinates></vertex>
                      <vertex><coordinates><x>0</x><y>6</y><z>0</z></coordinates></vertex>
                      <vertex><coordinates><x>0</x><y>0</y><z>6</z></coordinates></vertex>
                    </vertices>
                    <volume>
                      <triangle><v1>0</v1><v2>2</v2><v3>1</v3></triangle>
                      <triangle><v1>0</v1><v2>1</v2><v3>3</v3></triangle>
                      <triangle><v1>0</v1><v2>3</v2><v3>2</v3></triangle>
                      <triangle><v1>1</v1><v2>2</v2><v3>3</v3></triangle>
                    </volume>
                  </mesh>
                </object>
                """.formatted(objectId);
    }

    @Test
    void parsesAKnownGoodAmfTetrahedronToHandComputedValues() {
        String amf = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><amf unit=\"millimeter\">"
                + tetrahedronObject("0") + "</amf>";

        GeometryResult result = parser.parse(bytes(amf), "tetrahedron.amf");

        assertTrue(result.parseSucceeded());
        assertEquals(4, result.triangleCount());
        assertEquals(TETRAHEDRON_VOLUME_CM3, result.volumeCm3(), 0.0005);
        assertEquals(TETRAHEDRON_SURFACE_AREA_CM2, result.surfaceAreaCm2(), 0.0005);
        assertEquals(6.0, result.boundingBoxX(), 0.01);
        assertEquals(6.0, result.boundingBoxY(), 0.01);
        assertEquals(6.0, result.boundingBoxZ(), 0.01);
    }

    @Test
    void multipleObjectsAreSummedIntoOneCombinedResult() {
        // Two identical tetrahedra, as separate <object> elements — an AMF
        // file is printed as one job, so geometry across all objects
        // should combine into a single result: double the triangle count
        // and double the volume/area of one tetrahedron alone.
        String amf = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><amf unit=\"millimeter\">"
                + tetrahedronObject("0") + tetrahedronObject("1") + "</amf>";

        GeometryResult result = parser.parse(bytes(amf), "two-tetrahedra.amf");

        assertTrue(result.parseSucceeded());
        assertEquals(8, result.triangleCount());
        assertEquals(TETRAHEDRON_VOLUME_CM3 * 2, result.volumeCm3(), 0.001);
        assertEquals(TETRAHEDRON_SURFACE_AREA_CM2 * 2, result.surfaceAreaCm2(), 0.001);
    }

    @Test
    void malformedXmlFailsCleanlyWithoutThrowing() {
        byte[] garbage = bytes("<amf><object><mesh><vertices>NOT VALID XML<<<");

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(garbage, "malformed.amf"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void faceReferencingOutOfRangeVertexIndexFailsCleanlyWithoutThrowing() {
        String amf = """
                <?xml version="1.0" encoding="UTF-8"?>
                <amf unit="millimeter">
                  <object id="0">
                    <mesh>
                      <vertices>
                        <vertex><coordinates><x>0</x><y>0</y><z>0</z></coordinates></vertex>
                        <vertex><coordinates><x>6</x><y>0</y><z>0</z></coordinates></vertex>
                      </vertices>
                      <volume>
                        <triangle><v1>0</v1><v2>1</v2><v3>99</v3></triangle>
                      </volume>
                    </mesh>
                  </object>
                </amf>
                """;

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(bytes(amf), "out-of-range.amf"));

        assertFalse(result.parseSucceeded());
    }
}
