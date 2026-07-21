package com.printforge.printforge.fileservice.geometry;

import com.printforge.printforge.fileservice.geometry.TriangleMeshGeometry.Accumulator;
import com.printforge.printforge.fileservice.geometry.TriangleMeshGeometry.GeometryResult;
import com.printforge.printforge.fileservice.geometry.TriangleMeshGeometry.Vertex;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Parses a PLY file's actual mesh to get real volume/surface area for the
 * cost estimate — same purpose and downstream ModelFile/EstimateService
 * flow as the other geometry parsers. Volume/area math, validation, and
 * n-gon fan-triangulation are shared via TriangleMeshGeometry.
 *
 * PLY always has a plain-text header (through "end_header"), followed by
 * either an ASCII or a binary (little/big-endian) body — the header alone
 * declares which. Reused as-is for both bodies: the ordered list of
 * "property &lt;type&gt; &lt;name&gt;" declarations under "element vertex"
 * (needed to skip non-x/y/z properties like normals/colour correctly in
 * binary mode, and to pick the right token positions in ASCII mode), and
 * the face element's list-property type ("property list &lt;count-type&gt;
 * &lt;index-type&gt; vertex_indices").
 *
 * Never throws — any parse failure (malformed header, an unrecognized
 * property/face-list type, a byte/token count mismatch against the
 * declared vertex/face counts, an unresolvable index) or implausible
 * result comes back as GeometryResult.failed().
 */
@Slf4j
@Component
public class PlyGeometryParser {

    private static final Map<String, Integer> TYPE_BYTE_SIZES = Map.ofEntries(
            Map.entry("char", 1), Map.entry("int8", 1),
            Map.entry("uchar", 1), Map.entry("uint8", 1),
            Map.entry("short", 2), Map.entry("int16", 2),
            Map.entry("ushort", 2), Map.entry("uint16", 2),
            Map.entry("int", 4), Map.entry("int32", 4),
            Map.entry("uint", 4), Map.entry("uint32", 4),
            Map.entry("float", 4), Map.entry("float32", 4),
            Map.entry("double", 8), Map.entry("float64", 8)
    );

    private record VertexProperty(String name, String type) {}

    private record PlyHeader(
            boolean binary,
            ByteOrder byteOrder,
            int vertexCount,
            int faceCount,
            List<VertexProperty> vertexProperties,
            int xIndex, int yIndex, int zIndex,
            String faceCountType, String faceIndexType,
            int headerEndOffset
    ) {}

    public GeometryResult parse(byte[] bytes, String fileName) {
        try {
            PlyHeader header = parseHeader(bytes);
            if (header == null) {
                log.warn("PLY file '{}' has a malformed or unrecognized header — cannot parse geometry", fileName);
                return GeometryResult.failed();
            }
            if (header.vertexCount() > TriangleMeshGeometry.MAX_ELEMENTS
                    || header.faceCount() > TriangleMeshGeometry.MAX_ELEMENTS) {
                log.warn("PLY file '{}' declares {} vertices / {} faces, exceeding the {} cap — skipping geometry parse",
                        fileName, header.vertexCount(), header.faceCount(), TriangleMeshGeometry.MAX_ELEMENTS);
                return GeometryResult.failed();
            }

            Accumulator acc = new Accumulator();
            if (header.binary()) {
                parseBinaryBody(bytes, header, acc);
            } else {
                parseAsciiBody(bytes, header, acc);
            }
            return acc.build();
        } catch (Exception e) {
            log.warn("Failed to parse PLY geometry for file '{}': {}", fileName, e.getMessage());
            return GeometryResult.failed();
        }
    }

    /** Returns null if the header is malformed or declares anything this parser doesn't recognize — never throws, callers treat null as a clean parse failure. */
    private PlyHeader parseHeader(byte[] bytes) {
        int offset = 0;
        boolean binary = false;
        ByteOrder byteOrder = ByteOrder.LITTLE_ENDIAN;
        int vertexCount = -1;
        int faceCount = -1;
        List<VertexProperty> vertexProps = new ArrayList<>();
        String faceCountType = null;
        String faceIndexType = null;
        boolean inVertexElement = false;
        boolean inFaceElement = false;
        boolean sawFaceListProperty = false;
        boolean sawEndHeader = false;

        while (offset < bytes.length) {
            int lineStart = offset;
            int lineEnd = offset;
            while (lineEnd < bytes.length && bytes[lineEnd] != '\n') lineEnd++;
            String line = new String(bytes, lineStart, lineEnd - lineStart, StandardCharsets.US_ASCII).trim();
            offset = lineEnd + 1;

            if (line.isEmpty() || line.equals("ply") || line.startsWith("comment") || line.startsWith("obj_info")) {
                continue;
            }

            String[] parts = line.split("\\s+");

            if ("format".equals(parts[0])) {
                switch (parts[1]) {
                    case "ascii" -> binary = false;
                    case "binary_little_endian" -> { binary = true; byteOrder = ByteOrder.LITTLE_ENDIAN; }
                    case "binary_big_endian" -> { binary = true; byteOrder = ByteOrder.BIG_ENDIAN; }
                    default -> { return null; }
                }
            } else if ("element".equals(parts[0])) {
                String elementName = parts[1];
                int count = Integer.parseInt(parts[2]);
                if ("vertex".equals(elementName)) {
                    vertexCount = count;
                    inVertexElement = true;
                    inFaceElement = false;
                } else if ("face".equals(elementName)) {
                    faceCount = count;
                    inFaceElement = true;
                    inVertexElement = false;
                } else {
                    inVertexElement = false;
                    inFaceElement = false;
                }
            } else if ("property".equals(parts[0])) {
                if (inVertexElement) {
                    String type = parts[1];
                    String name = parts[2];
                    if (!TYPE_BYTE_SIZES.containsKey(type)) return null;
                    vertexProps.add(new VertexProperty(name, type));
                } else if (inFaceElement) {
                    if (!"list".equals(parts[1])) return null; // not a list property — unrecognized face format
                    String countType = parts[2];
                    String indexType = parts[3];
                    String propName = parts[4];
                    if (!"vertex_indices".equals(propName) && !"vertex_index".equals(propName)) return null;
                    if (!TYPE_BYTE_SIZES.containsKey(countType) || !TYPE_BYTE_SIZES.containsKey(indexType)) return null;
                    faceCountType = countType;
                    faceIndexType = indexType;
                    sawFaceListProperty = true;
                }
                // property of some other/ignored element — skip
            } else if ("end_header".equals(parts[0])) {
                sawEndHeader = true;
                break;
            }
        }

        if (!sawEndHeader || vertexCount < 0 || faceCount < 0 || !sawFaceListProperty) return null;

        int xIndex = indexOfProperty(vertexProps, "x");
        int yIndex = indexOfProperty(vertexProps, "y");
        int zIndex = indexOfProperty(vertexProps, "z");
        if (xIndex < 0 || yIndex < 0 || zIndex < 0) return null;

        return new PlyHeader(binary, byteOrder, vertexCount, faceCount, vertexProps,
                xIndex, yIndex, zIndex, faceCountType, faceIndexType, offset);
    }

    private int indexOfProperty(List<VertexProperty> props, String name) {
        for (int i = 0; i < props.size(); i++) {
            if (props.get(i).name().equals(name)) return i;
        }
        return -1;
    }

    private void parseBinaryBody(byte[] bytes, PlyHeader header, Accumulator acc) {
        ByteBuffer buf = ByteBuffer.wrap(bytes).order(header.byteOrder());
        buf.position(header.headerEndOffset());

        List<Vertex> vertices = new ArrayList<>(header.vertexCount());
        for (int i = 0; i < header.vertexCount(); i++) {
            double x = 0, y = 0, z = 0;
            List<VertexProperty> props = header.vertexProperties();
            for (int p = 0; p < props.size(); p++) {
                double value = readTypedValue(buf, props.get(p).type());
                if (p == header.xIndex()) x = value;
                else if (p == header.yIndex()) y = value;
                else if (p == header.zIndex()) z = value;
            }
            vertices.add(new Vertex(x, y, z));
        }

        int faceCountSize = TYPE_BYTE_SIZES.get(header.faceCountType());
        int faceIndexSize = TYPE_BYTE_SIZES.get(header.faceIndexType());
        for (int i = 0; i < header.faceCount(); i++) {
            long indexCount = readUnsigned(buf, faceCountSize);
            List<Vertex> faceVertices = new ArrayList<>((int) indexCount);
            for (long j = 0; j < indexCount; j++) {
                long idx = readUnsigned(buf, faceIndexSize);
                if (idx < 0 || idx >= vertices.size()) {
                    throw new IllegalArgumentException("Face references out-of-range vertex index " + idx);
                }
                faceVertices.add(vertices.get((int) idx));
            }
            acc.addFace(faceVertices);
        }
    }

    private void parseAsciiBody(byte[] bytes, PlyHeader header, Accumulator acc) {
        String bodyText = new String(bytes, header.headerEndOffset(), bytes.length - header.headerEndOffset(),
                StandardCharsets.US_ASCII);
        String[] lines = bodyText.split("\\r?\\n");
        int lineIdx = 0;

        List<Vertex> vertices = new ArrayList<>(header.vertexCount());
        for (int i = 0; i < header.vertexCount(); i++) {
            lineIdx = skipBlankLines(lines, lineIdx);
            if (lineIdx >= lines.length) throw new IllegalArgumentException("Unexpected end of file while reading vertices");
            String[] tokens = lines[lineIdx++].trim().split("\\s+");
            if (tokens.length < header.vertexProperties().size()) {
                throw new IllegalArgumentException("Vertex line has fewer tokens than declared properties");
            }
            vertices.add(new Vertex(
                    Double.parseDouble(tokens[header.xIndex()]),
                    Double.parseDouble(tokens[header.yIndex()]),
                    Double.parseDouble(tokens[header.zIndex()])));
        }

        for (int i = 0; i < header.faceCount(); i++) {
            lineIdx = skipBlankLines(lines, lineIdx);
            if (lineIdx >= lines.length) throw new IllegalArgumentException("Unexpected end of file while reading faces");
            String[] tokens = lines[lineIdx++].trim().split("\\s+");
            int indexCount = Integer.parseInt(tokens[0]);
            List<Vertex> faceVertices = new ArrayList<>(indexCount);
            for (int j = 1; j <= indexCount; j++) {
                int idx = Integer.parseInt(tokens[j]);
                if (idx < 0 || idx >= vertices.size()) {
                    throw new IllegalArgumentException("Face references out-of-range vertex index " + idx);
                }
                faceVertices.add(vertices.get(idx));
            }
            acc.addFace(faceVertices);
        }
    }

    private int skipBlankLines(String[] lines, int lineIdx) {
        while (lineIdx < lines.length && lines[lineIdx].trim().isEmpty()) lineIdx++;
        return lineIdx;
    }

    /** Reads one value of the given PLY type and advances the buffer — used for every vertex property, whether it ends up being x/y/z or a skipped one (normal/colour/etc), since either way the buffer must advance by the right number of bytes. */
    private double readTypedValue(ByteBuffer buf, String type) {
        return switch (type) {
            case "char", "int8" -> buf.get();
            case "uchar", "uint8" -> buf.get() & 0xFF;
            case "short", "int16" -> buf.getShort();
            case "ushort", "uint16" -> buf.getShort() & 0xFFFF;
            case "int", "int32" -> buf.getInt();
            case "uint", "uint32" -> buf.getInt() & 0xFFFFFFFFL;
            case "float", "float32" -> buf.getFloat();
            case "double", "float64" -> buf.getDouble();
            default -> throw new IllegalArgumentException("Unsupported PLY property type: " + type);
        };
    }

    /** Reads a byteSize-wide integer as unsigned — face list counts/indices are never negative in a valid file. */
    private long readUnsigned(ByteBuffer buf, int byteSize) {
        return switch (byteSize) {
            case 1 -> buf.get() & 0xFFL;
            case 2 -> buf.getShort() & 0xFFFFL;
            case 4 -> buf.getInt() & 0xFFFFFFFFL;
            default -> throw new IllegalArgumentException("Unsupported index byte size " + byteSize);
        };
    }
}
