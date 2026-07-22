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
import java.util.ArrayList;
import java.util.List;

/**
 * Parses an AMF file's actual mesh to get real volume/surface area for the
 * cost estimate — same purpose and downstream ModelFile/EstimateService
 * flow as the other geometry parsers, just a plain (uncompressed) XML
 * source format, no zip layer. Volume/area math and validation are shared
 * via TriangleMeshGeometry.
 *
 * AMF can contain multiple <object><mesh> blocks — an AMF file is meant to
 * be printed as one combined job, so every object's geometry is summed
 * into a single Accumulator. Each mesh's <volume><triangle> v1/v2/v3
 * indices are 0-indexed and scoped to that mesh's own <vertices> list, so
 * each mesh is resolved independently (same approach as
 * ThreeMfGeometryParser's multi-mesh handling).
 *
 * Never throws — any parse failure (malformed/missing XML elements,
 * unresolvable index) or implausible result comes back as
 * GeometryResult.failed() so a bad file degrades to the file-size fallback
 * rather than blocking the upload.
 */
@Slf4j
@Component
public class AmfGeometryParser {

    public GeometryResult parse(byte[] bytes, String fileName) {
        try {
            Document doc = parseXml(bytes);
            Accumulator acc = new Accumulator();

            NodeList meshes = doc.getElementsByTagName("mesh");
            for (int m = 0; m < meshes.getLength(); m++) {
                Element mesh = (Element) meshes.item(m);
                List<Vertex> vertices = readVertices(mesh);
                addTrianglesForMesh(mesh, vertices, acc);
            }

            return acc.build();
        } catch (Exception e) {
            log.warn("Failed to parse AMF geometry for file '{}': {}", fileName, e.getMessage());
            return GeometryResult.failed();
        }
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

    /** Reads a mesh's <vertices><vertex><coordinates><x>/<y>/<z></coordinates></vertex></vertices>, in document order. */
    private List<Vertex> readVertices(Element mesh) {
        List<Vertex> vertices = new ArrayList<>();
        NodeList verticesNodes = mesh.getElementsByTagName("vertices");
        if (verticesNodes.getLength() == 0) return vertices;

        NodeList vertexNodes = ((Element) verticesNodes.item(0)).getElementsByTagName("vertex");
        for (int i = 0; i < vertexNodes.getLength(); i++) {
            if (vertices.size() >= TriangleMeshGeometry.MAX_ELEMENTS) break;
            Element vertexEl = (Element) vertexNodes.item(i);
            NodeList coordsNodes = vertexEl.getElementsByTagName("coordinates");
            if (coordsNodes.getLength() == 0) continue;
            Element coords = (Element) coordsNodes.item(0);

            double x = childText(coords, "x");
            double y = childText(coords, "y");
            double z = childText(coords, "z");
            vertices.add(new Vertex(x, y, z));
        }
        return vertices;
    }

    /** Reads a mesh's <volume><triangle><v1>/<v2>/<v3></triangle></volume>, resolving 0-indexed references against that mesh's own vertex list. */
    private void addTrianglesForMesh(Element mesh, List<Vertex> vertices, Accumulator acc) {
        NodeList volumeNodes = mesh.getElementsByTagName("volume");
        if (volumeNodes.getLength() == 0) return;

        NodeList triangleNodes = ((Element) volumeNodes.item(0)).getElementsByTagName("triangle");
        for (int i = 0; i < triangleNodes.getLength(); i++) {
            Node node = triangleNodes.item(i);
            if (!(node instanceof Element triangle)) continue;

            int i1 = (int) childText(triangle, "v1");
            int i2 = (int) childText(triangle, "v2");
            int i3 = (int) childText(triangle, "v3");

            if (i1 < 0 || i1 >= vertices.size() || i2 < 0 || i2 >= vertices.size()
                    || i3 < 0 || i3 >= vertices.size()) {
                throw new IllegalArgumentException(
                        "Triangle references out-of-range vertex index (v1=" + i1 + ", v2=" + i2 + ", v3=" + i3 + ")");
            }

            acc.addTriangle(vertices.get(i1), vertices.get(i2), vertices.get(i3));
        }
    }

    /** Text content of the first direct child element with the given tag name, parsed as a double. */
    private double childText(Element parent, String tagName) {
        NodeList children = parent.getElementsByTagName(tagName);
        if (children.getLength() == 0) {
            throw new IllegalArgumentException("Missing <" + tagName + "> element");
        }
        return Double.parseDouble(children.item(0).getTextContent().trim());
    }
}
