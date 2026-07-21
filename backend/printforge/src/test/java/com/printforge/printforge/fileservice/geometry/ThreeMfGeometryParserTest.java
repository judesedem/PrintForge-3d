package com.printforge.printforge.fileservice.geometry;

import com.printforge.printforge.fileservice.geometry.TriangleMeshGeometry.GeometryResult;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure unit test, no Spring context or DB.
 *
 * Reuses the same right-angle tetrahedron as StlGeometryParserTest/
 * ObjGeometryParserTest (O=(0,0,0), A=(6,0,0), B=(0,6,0), C=(0,0,6), edge
 * 6mm — volume=0.036cm3, surfaceArea=(54+18*sqrt(3))/100 cm2), packaged as
 * a real zip archive containing "3D/3dmodel.model" — proving the shared
 * TriangleMeshGeometry math produces identical results regardless of
 * which parser/format feeds it triangles.
 *
 * Run with: ./mvnw test -Dtest=ThreeMfGeometryParserTest
 */
class ThreeMfGeometryParserTest {

    private final ThreeMfGeometryParser parser = new ThreeMfGeometryParser();

    private static final double TETRAHEDRON_VOLUME_CM3 = 0.036;
    private static final double TETRAHEDRON_SURFACE_AREA_CM2 = (54 + 18 * Math.sqrt(3)) / 100.0;

    // Vertices 0=O, 1=A, 2=B, 3=C; faces mirror the STL/OBJ tests'
    // (O,B,A),(O,A,C),(O,C,B),(A,B,C) winding, 0-indexed per the 3MF spec.
    private static final String TETRAHEDRON_MODEL_XML = """
            <?xml version="1.0" encoding="UTF-8"?>
            <model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
              <resources>
                <object id="1" type="model">
                  <mesh>
                    <vertices>
                      <vertex x="0" y="0" z="0"/>
                      <vertex x="6" y="0" z="0"/>
                      <vertex x="0" y="6" z="0"/>
                      <vertex x="0" y="0" z="6"/>
                    </vertices>
                    <triangles>
                      <triangle v1="0" v2="2" v3="1"/>
                      <triangle v1="0" v2="1" v3="3"/>
                      <triangle v1="0" v2="3" v3="2"/>
                      <triangle v1="1" v2="2" v3="3"/>
                    </triangles>
                  </mesh>
                </object>
              </resources>
              <build>
                <item objectid="1"/>
              </build>
            </model>
            """;

    private static byte[] buildZip(String entryName, String content) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            zos.putNextEntry(new ZipEntry(entryName));
            zos.write(content.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
        }
        return baos.toByteArray();
    }

    @Test
    void parsesAKnownGood3mfTetrahedronToHandComputedValues() throws Exception {
        byte[] threeMf = buildZip("3D/3dmodel.model", TETRAHEDRON_MODEL_XML);

        GeometryResult result = parser.parse(threeMf, "tetrahedron.3mf");

        assertTrue(result.parseSucceeded());
        assertEquals(4, result.triangleCount());
        assertEquals(TETRAHEDRON_VOLUME_CM3, result.volumeCm3(), 0.0005);
        assertEquals(TETRAHEDRON_SURFACE_AREA_CM2, result.surfaceAreaCm2(), 0.0005);
        assertEquals(6.0, result.boundingBoxX(), 0.01);
        assertEquals(6.0, result.boundingBoxY(), 0.01);
        assertEquals(6.0, result.boundingBoxZ(), 0.01);
    }

    @Test
    void missingModelEntryFailsCleanlyWithoutThrowing() throws Exception {
        byte[] zipWithoutModel = buildZip("some/other/file.txt", "not a 3d model");

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(zipWithoutModel, "no-model.3mf"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void notActuallyAZipFailsCleanlyWithoutThrowing() {
        byte[] garbage = "this is not a zip archive at all".getBytes(StandardCharsets.UTF_8);

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(garbage, "not-a-zip.3mf"));

        assertFalse(result.parseSucceeded());
    }

    @Test
    void malformedXmlInsideValidZipFailsCleanlyWithoutThrowing() throws Exception {
        byte[] threeMf = buildZip("3D/3dmodel.model", "<model><resources><object><mesh><vertices>NOT VALID XML<<<");

        GeometryResult result = assertDoesNotThrow(
                () -> parser.parse(threeMf, "malformed.3mf"));

        assertFalse(result.parseSucceeded());
    }
}
