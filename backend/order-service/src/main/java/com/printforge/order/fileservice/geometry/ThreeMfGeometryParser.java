package com.printforge.order.fileservice.geometry;

import com.printforge.order.fileservice.geometry.TriangleMeshGeometry.Accumulator;
import com.printforge.order.fileservice.geometry.TriangleMeshGeometry.GeometryResult;
import com.printforge.order.fileservice.geometry.TriangleMeshGeometry.Vertex;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Parses a 3MF file's actual mesh to get real volume/surface area for the
 * cost estimate — same purpose and downstream ModelFile/EstimateService
 * flow as StlGeometryParser/ObjGeometryParser, just a zip-wrapped XML
 * source format. Volume/area math and result validation are shared via
 * TriangleMeshGeometry rather than duplicated.
 *
 * 3MF is a ZIP archive containing "3D/3dmodel.model", an XML document
 * whose <resources> can hold multiple <object><mesh> blocks — each mesh's
 * <triangle v1/v2/v3> indices are 0-indexed and scoped to that mesh's own
 * <vertices> list, not shared globally, so each mesh is resolved
 * independently before its triangles are added to the same combined
 * Accumulator (the whole file is treated as one print job).
 *
 * Never throws — any parse failure (can't open as zip, entry not found,
 * malformed XML, unresolvable index) or implausible result comes back as
 * GeometryResult.failed() so a bad file degrades to the file-size fallback
 * rather than blocking the upload.
 */
@Slf4j
@Component
public class ThreeMfGeometryParser {

    private static final String MODEL_ENTRY_NAME = "3D/3dmodel.model";

    public GeometryResult parse(byte[] bytes, String fileName) {
        try {
            byte[] modelXml = readZipEntry(bytes, MODEL_ENTRY_NAME);
            if (modelXml == null) {
                log.warn("3MF file '{}' has no '{}' entry — cannot parse geometry", fileName, MODEL_ENTRY_NAME);
                return GeometryResult.failed();
            }

            Document doc = parseXml(modelXml);
            Accumulator acc = new Accumulator();

            NodeList meshes = doc.getElementsByTagName("mesh");
            for (int m = 0; m < meshes.getLength(); m++) {
                Element mesh = (Element) meshes.item(m);
                List<Vertex> vertices = readVertices(mesh);
                addTrianglesForMesh(mesh, vertices, acc);
            }

            return acc.build();
        } catch (Exception e) {
            log.warn("Failed to parse 3MF geometry for file '{}': {}", fileName, e.getMessage());
            return GeometryResult.failed();
        }
    }

    /** Returns the named zip entry's bytes, or null if the archive doesn't contain it. */
    private byte[] readZipEntry(byte[] zipBytes, String entryName) throws Exception {
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipBytes))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entryName.equals(entry.getName())) {
                    return readAll(zis);
                }
            }
        }
        return null;
    }

    private byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) != -1) {
            out.write(buf, 0, n);
        }
        return out.toByteArray();
    }

    private Document parseXml(byte[] xmlBytes) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // Untrusted, user-uploaded content — disable external entity
        // resolution/DTDs so a crafted file can't attempt XXE.
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        DocumentBuilder builder = factory.newDocumentBuilder();
        return builder.parse(new ByteArrayInputStream(xmlBytes));
    }

    /** Reads a mesh's own <vertices><vertex x=".." y=".." z=".."/></vertices> list, in document order (index 0 = first). */
    private List<Vertex> readVertices(Element mesh) {
        List<Vertex> vertices = new ArrayList<>();
        NodeList verticesNodes = mesh.getElementsByTagName("vertices");
        if (verticesNodes.getLength() == 0) return vertices;

        NodeList vertexNodes = ((Element) verticesNodes.item(0)).getElementsByTagName("vertex");
        for (int i = 0; i < vertexNodes.getLength(); i++) {
            if (vertices.size() >= TriangleMeshGeometry.MAX_ELEMENTS) break;
            Element v = (Element) vertexNodes.item(i);
            vertices.add(new Vertex(
                    Double.parseDouble(v.getAttribute("x")),
                    Double.parseDouble(v.getAttribute("y")),
                    Double.parseDouble(v.getAttribute("z"))));
        }
        return vertices;
    }

    /** Reads a mesh's own <triangles><triangle v1=".." v2=".." v3=".."/></triangles>, resolving 0-indexed references against that mesh's own vertex list. */
    private void addTrianglesForMesh(Element mesh, List<Vertex> vertices, Accumulator acc) {
        NodeList trianglesNodes = mesh.getElementsByTagName("triangles");
        if (trianglesNodes.getLength() == 0) return;

        NodeList triangleNodes = ((Element) trianglesNodes.item(0)).getElementsByTagName("triangle");
        for (int i = 0; i < triangleNodes.getLength(); i++) {
            Node node = triangleNodes.item(i);
            if (!(node instanceof Element triangle)) continue;

            int i1 = Integer.parseInt(triangle.getAttribute("v1"));
            int i2 = Integer.parseInt(triangle.getAttribute("v2"));
            int i3 = Integer.parseInt(triangle.getAttribute("v3"));

            if (i1 < 0 || i1 >= vertices.size() || i2 < 0 || i2 >= vertices.size()
                    || i3 < 0 || i3 >= vertices.size()) {
                throw new IllegalArgumentException(
                        "Triangle references out-of-range vertex index (v1=" + i1 + ", v2=" + i2 + ", v3=" + i3 + ")");
            }

            acc.addTriangle(vertices.get(i1), vertices.get(i2), vertices.get(i3));
        }
    }
}
