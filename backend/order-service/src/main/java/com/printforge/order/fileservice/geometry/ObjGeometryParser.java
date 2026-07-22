package com.printforge.order.fileservice.geometry;

import com.printforge.order.fileservice.geometry.TriangleMeshGeometry.Accumulator;
import com.printforge.order.fileservice.geometry.TriangleMeshGeometry.GeometryResult;
import com.printforge.order.fileservice.geometry.TriangleMeshGeometry.Vertex;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses an OBJ file's actual mesh to get real volume/surface area for the
 * cost estimate — same purpose and same downstream ModelFile/EstimateService
 * flow as StlGeometryParser, just a different (plain-text) source format.
 * Volume/area math and result validation are shared via TriangleMeshGeometry
 * rather than duplicated — this class only knows how to find an OBJ file's
 * triangles.
 *
 * Never throws — any parse failure or implausible result comes back as
 * GeometryResult.failed() so a bad file degrades to the file-size fallback
 * rather than blocking the upload.
 */
@Slf4j
@Component
public class ObjGeometryParser {

    /**
     * @param bytes    raw file bytes
     * @param fileName original filename, used only for warning-log context
     */
    public GeometryResult parse(byte[] bytes, String fileName) {
        try {
            String text = new String(bytes, StandardCharsets.UTF_8);
            String[] lines = text.split("\\r?\\n");

            // 1-indexed per OBJ convention: vertices.get(0) is index 1.
            List<Vertex> vertices = new ArrayList<>();
            Accumulator acc = new Accumulator();

            for (String rawLine : lines) {
                String line = rawLine.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;

                String[] tokens = line.split("\\s+");
                String tag = tokens[0];

                if ("v".equals(tag)) {
                    if (vertices.size() >= TriangleMeshGeometry.MAX_ELEMENTS) {
                        log.warn("OBJ file '{}' exceeds the {} vertex cap — aborting geometry parse",
                                fileName, TriangleMeshGeometry.MAX_ELEMENTS);
                        return GeometryResult.failed();
                    }
                    if (tokens.length < 4) continue; // malformed line — skip defensively

                    vertices.add(new Vertex(
                            Double.parseDouble(tokens[1]),
                            Double.parseDouble(tokens[2]),
                            Double.parseDouble(tokens[3])));

                } else if ("f".equals(tag)) {
                    // "vt"/"vn" lines are simply never matched above (ignored),
                    // as are "o"/"g"/"s" — the whole file is one combined mesh.
                    List<Vertex> faceVertices = resolveFaceVertices(tokens, vertices);
                    acc.addFace(faceVertices); // fan-triangulates; no-ops for <3 vertices
                }
                // any other tag ("vt", "vn", "o", "g", "s") — ignored
            }

            return acc.build();
        } catch (Exception e) {
            log.warn("Failed to parse OBJ geometry for file '{}': {}", fileName, e.getMessage());
            return GeometryResult.failed();
        }
    }

    /** Resolves each "f" line token (v, v/vt, v/vt/vn, or v//vn) to its vertex, handling negative (relative) indices. */
    private List<Vertex> resolveFaceVertices(String[] tokens, List<Vertex> vertices) {
        List<Vertex> resolved = new ArrayList<>(tokens.length - 1);
        for (int t = 1; t < tokens.length; t++) {
            String token = tokens[t];
            if (token.isEmpty()) continue;

            String vertexIndexPart = token.split("/", -1)[0];
            if (vertexIndexPart.isEmpty()) continue; // malformed token — skip defensively

            int rawIndex = Integer.parseInt(vertexIndexPart);
            int resolvedIndex = rawIndex < 0
                    ? vertices.size() + 1 + rawIndex  // negative = relative to vertices defined so far
                    : rawIndex;

            // 1-indexed per OBJ convention.
            if (resolvedIndex < 1 || resolvedIndex > vertices.size()) {
                throw new IllegalArgumentException("Face references out-of-range vertex index " + rawIndex);
            }
            resolved.add(vertices.get(resolvedIndex - 1));
        }
        return resolved;
    }
}
