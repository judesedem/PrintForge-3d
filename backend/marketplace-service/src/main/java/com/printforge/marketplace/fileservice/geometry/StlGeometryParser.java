package com.printforge.marketplace.fileservice.geometry;

import com.printforge.marketplace.fileservice.geometry.TriangleMeshGeometry.Accumulator;
import com.printforge.marketplace.fileservice.geometry.TriangleMeshGeometry.GeometryResult;
import com.printforge.marketplace.fileservice.geometry.TriangleMeshGeometry.Vertex;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses an STL file's actual triangle mesh to get real volume/surface area
 * for the cost estimate, replacing the old fileSizeKb-as-weight-proxy
 * heuristic for STL uploads (see EstimateService). File size reflects mesh
 * triangle count/detail, not physical volume — the two aren't related.
 *
 * Detects binary vs ASCII STL, parses triangles in a single pass (nothing
 * beyond one triangle's worth of data is retained in memory at a time),
 * and never throws — any parse failure or implausible result comes back as
 * GeometryResult.failed() so a bad file degrades to the file-size fallback
 * rather than blocking the upload.
 *
 * The volume/area math and result validation are shared with
 * ObjGeometryParser via TriangleMeshGeometry — nothing format-specific
 * lives there, only the "how do I find a mesh's triangles in THIS file
 * format" logic lives here.
 */
@Slf4j
@Component
public class StlGeometryParser {

    /**
     * @param bytes    raw file bytes
     * @param fileName original filename, used only for warning-log context
     */
    public GeometryResult parse(byte[] bytes, String fileName) {
        try {
            if (bytes.length >= 84) {
                long declaredTriangles = readUint32LE(bytes, 80);
                long expectedBinaryLength = 84L + declaredTriangles * 50L;
                if (bytes.length == expectedBinaryLength) {
                    if (declaredTriangles > TriangleMeshGeometry.MAX_ELEMENTS) {
                        log.warn("STL file '{}' declares {} triangles, exceeding the {} cap — skipping geometry parse",
                                fileName, declaredTriangles, TriangleMeshGeometry.MAX_ELEMENTS);
                        return GeometryResult.failed();
                    }
                    return parseBinary(bytes, (int) declaredTriangles);
                }
            }
            return parseAscii(bytes, fileName);
        } catch (Exception e) {
            log.warn("Failed to parse STL geometry for file '{}': {}", fileName, e.getMessage());
            return GeometryResult.failed();
        }
    }

    private GeometryResult parseBinary(byte[] bytes, int triangleCount) {
        ByteBuffer buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
        buf.position(84);

        Accumulator acc = new Accumulator();

        for (int i = 0; i < triangleCount; i++) {
            buf.position(buf.position() + 12); // normal — ignored, not trusted

            Vertex v1 = new Vertex(buf.getFloat(), buf.getFloat(), buf.getFloat());
            Vertex v2 = new Vertex(buf.getFloat(), buf.getFloat(), buf.getFloat());
            Vertex v3 = new Vertex(buf.getFloat(), buf.getFloat(), buf.getFloat());

            buf.position(buf.position() + 2); // attribute byte count — ignored

            acc.addTriangle(v1, v2, v3);
        }

        return acc.build();
    }

    private GeometryResult parseAscii(byte[] bytes, String fileName) {
        String text = new String(bytes, StandardCharsets.UTF_8);
        String[] lines = text.split("\\r?\\n");

        Accumulator acc = new Accumulator();
        List<Vertex> pending = new ArrayList<>(3);

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isEmpty()) continue;
            String lower = line.toLowerCase();

            if (lower.startsWith("solid") || lower.startsWith("endsolid")
                    || lower.startsWith("facet") || lower.startsWith("outer loop")
                    || lower.startsWith("endloop") || lower.startsWith("endfacet")) {
                continue;
            }

            if (lower.startsWith("vertex")) {
                String[] parts = line.split("\\s+");
                if (parts.length < 4) continue; // malformed line — skip defensively, don't fail the whole parse

                double x = Double.parseDouble(parts[1]);
                double y = Double.parseDouble(parts[2]);
                double z = Double.parseDouble(parts[3]);
                pending.add(new Vertex(x, y, z));

                if (pending.size() == 3) {
                    acc.addTriangle(pending.get(0), pending.get(1), pending.get(2));
                    pending.clear();

                    if (acc.triangleCount() > TriangleMeshGeometry.MAX_ELEMENTS) {
                        log.warn("ASCII STL file '{}' exceeds the {} triangle cap — aborting geometry parse",
                                fileName, TriangleMeshGeometry.MAX_ELEMENTS);
                        return GeometryResult.failed();
                    }
                }
            }
        }

        return acc.build();
    }

    /** Bytes 80-83 as a little-endian uint32 — a long, since uint32 can exceed Integer.MAX_VALUE. */
    private static long readUint32LE(byte[] bytes, int offset) {
        return (bytes[offset] & 0xFFL)
                | ((bytes[offset + 1] & 0xFFL) << 8)
                | ((bytes[offset + 2] & 0xFFL) << 16)
                | ((bytes[offset + 3] & 0xFFL) << 24);
    }
}
