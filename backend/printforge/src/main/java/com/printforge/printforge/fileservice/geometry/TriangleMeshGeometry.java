package com.printforge.printforge.fileservice.geometry;

import java.util.List;

/**
 * Format-agnostic triangle mesh math shared by every geometry parser
 * (STL/OBJ/3MF/AMF/PLY) — volume (signed tetrahedron sum), surface area
 * (cross product sum), bounding box, fan-triangulation of n-gon faces, and
 * the validation rules that decide whether a parsed result is trustworthy.
 * No parser duplicates this formula; each builds a mesh into an
 * Accumulator triangle-by-triangle (or face-by-face via addFace()) and
 * calls build() once at the end.
 */
public final class TriangleMeshGeometry {

    /** Below this many triangles, a "mesh" isn't trustworthy enough to cost a print off of. */
    private static final int MIN_VALID_TRIANGLES = 4;
    /** Slack allowed when checking that mesh volume doesn't exceed its own bounding box — floating point tolerance, not a real geometric allowance. */
    private static final double BOUNDING_BOX_VOLUME_SLACK = 1.05;
    /** Shared protective cap value — STL applies it to triangle count, OBJ to vertex count (OBJ has no upfront declared triangle count the way binary STL does). */
    public static final int MAX_ELEMENTS = 2_000_000;

    private TriangleMeshGeometry() {}

    public record Vertex(double x, double y, double z) {}

    public record GeometryResult(
            double volumeCm3,
            double surfaceAreaCm2,
            double boundingBoxX,
            double boundingBoxY,
            double boundingBoxZ,
            int triangleCount,
            boolean parseSucceeded
    ) {
        public static GeometryResult failed() {
            return new GeometryResult(0, 0, 0, 0, 0, 0, false);
        }
    }

    /**
     * Single-pass accumulator — running bounding box, volume, and area
     * across triangles fed in one at a time via addTriangle(), so neither
     * parser needs to retain a full triangle list in memory. Call build()
     * once every triangle has been added to get the validated result.
     */
    public static final class Accumulator {
        private double minX = Double.POSITIVE_INFINITY, minY = Double.POSITIVE_INFINITY, minZ = Double.POSITIVE_INFINITY;
        private double maxX = Double.NEGATIVE_INFINITY, maxY = Double.NEGATIVE_INFINITY, maxZ = Double.NEGATIVE_INFINITY;
        private double volumeSum = 0;
        private double areaSum = 0;
        private int triangleCount = 0;

        public void addTriangle(Vertex v1, Vertex v2, Vertex v3) {
            minX = Math.min(minX, min3(v1.x(), v2.x(), v3.x()));
            minY = Math.min(minY, min3(v1.y(), v2.y(), v3.y()));
            minZ = Math.min(minZ, min3(v1.z(), v2.z(), v3.z()));
            maxX = Math.max(maxX, max3(v1.x(), v2.x(), v3.x()));
            maxY = Math.max(maxY, max3(v1.y(), v2.y(), v3.y()));
            maxZ = Math.max(maxZ, max3(v1.z(), v2.z(), v3.z()));

            volumeSum += signedVolume(v1, v2, v3);
            areaSum += triangleArea(v1, v2, v3);
            triangleCount++;
        }

        /**
         * Fan-triangulates an n-gon face (n>=3) and adds each resulting
         * triangle: triangle i = (v1, v[i+1], v[i+2]). Shared by
         * ObjGeometryParser and PlyGeometryParser rather than each
         * reimplementing the same fan-out. Faces with fewer than 3
         * vertices are silently ignored — not fatal to the rest of the
         * parse, matching both parsers' existing per-face tolerance.
         */
        public void addFace(List<Vertex> faceVertices) {
            if (faceVertices.size() < 3) return;
            Vertex v1 = faceVertices.get(0);
            for (int i = 1; i < faceVertices.size() - 1; i++) {
                addTriangle(v1, faceVertices.get(i), faceVertices.get(i + 1));
            }
        }

        public int triangleCount() {
            return triangleCount;
        }

        public GeometryResult build() {
            return buildResult(triangleCount, minX, minY, minZ, maxX, maxY, maxZ, volumeSum, areaSum);
        }
    }

    private static GeometryResult buildResult(int triangleCount,
                                                double minX, double minY, double minZ,
                                                double maxX, double maxY, double maxZ,
                                                double volumeSumMm3, double areaSumMm2) {
        if (triangleCount < MIN_VALID_TRIANGLES) {
            return GeometryResult.failed();
        }

        double volumeCm3 = Math.abs(volumeSumMm3) / 1000.0;
        if (volumeCm3 <= 0) {
            return GeometryResult.failed();
        }

        double surfaceAreaCm2 = areaSumMm2 / 100.0;
        double boundingBoxX = maxX - minX;
        double boundingBoxY = maxY - minY;
        double boundingBoxZ = maxZ - minZ;

        double boundingBoxVolumeCm3 = (boundingBoxX * boundingBoxY * boundingBoxZ) / 1000.0;
        if (volumeCm3 > boundingBoxVolumeCm3 * BOUNDING_BOX_VOLUME_SLACK) {
            return GeometryResult.failed();
        }

        return new GeometryResult(volumeCm3, surfaceAreaCm2, boundingBoxX, boundingBoxY, boundingBoxZ, triangleCount, true);
    }

    static double signedVolume(Vertex v1, Vertex v2, Vertex v3) {
        return (1.0 / 6.0) * (
                -v3.x() * v2.y() * v1.z() + v2.x() * v3.y() * v1.z()
                        + v3.x() * v1.y() * v2.z() - v1.x() * v3.y() * v2.z()
                        - v2.x() * v1.y() * v3.z() + v1.x() * v2.y() * v3.z()
        );
    }

    static double triangleArea(Vertex v1, Vertex v2, Vertex v3) {
        double e1x = v2.x() - v1.x(), e1y = v2.y() - v1.y(), e1z = v2.z() - v1.z();
        double e2x = v3.x() - v1.x(), e2y = v3.y() - v1.y(), e2z = v3.z() - v1.z();

        double crossX = e1y * e2z - e1z * e2y;
        double crossY = e1z * e2x - e1x * e2z;
        double crossZ = e1x * e2y - e1y * e2x;

        double magnitude = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
        return 0.5 * magnitude;
    }

    private static double min3(double a, double b, double c) {
        return Math.min(a, Math.min(b, c));
    }

    private static double max3(double a, double b, double c) {
        return Math.max(a, Math.max(b, c));
    }
}
