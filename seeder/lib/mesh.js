'use strict';

// Parsers for the two mesh formats the seed catalog actually ships:
// STL (binary + ASCII) and OBJ. Both produce the same flat triangle
// soup — { positions: Float32Array, triangleCount } — because the
// renderer only ever needs per-face geometry, never the original
// index/vertex topology.

/**
 * Binary and ASCII STL share the `.stl` extension and an ASCII STL always
 * starts with "solid", but so do plenty of binary ones (the 80-byte header
 * is arbitrary text and some exporters write "solid ..." into it). The
 * only reliable discriminator is the length: a binary STL is exactly
 * 84 + 50*triangleCount bytes.
 */
function isBinarySTL(buf) {
  if (buf.length < 84) return false;
  const count = buf.readUInt32LE(80);
  return buf.length === 84 + count * 50;
}

function parseBinarySTL(buf) {
  const count = buf.readUInt32LE(80);
  const positions = new Float32Array(count * 9);
  let o = 84;
  for (let i = 0; i < count; i++) {
    // Skip the 12-byte face normal — the renderer recomputes normals from
    // the winding, which is more trustworthy than what exporters write.
    o += 12;
    for (let v = 0; v < 9; v++) {
      positions[i * 9 + v] = buf.readFloatLE(o);
      o += 4;
    }
    o += 2; // attribute byte count
  }
  return { positions, triangleCount: count };
}

function parseAsciiSTL(text) {
  const verts = [];
  const re = /vertex\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    verts.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  const triangleCount = Math.floor(verts.length / 9);
  return {
    positions: new Float32Array(verts.slice(0, triangleCount * 9)),
    triangleCount,
  };
}

function parseSTL(buf) {
  return isBinarySTL(buf) ? parseBinarySTL(buf) : parseAsciiSTL(buf.toString('utf8'));
}

/**
 * OBJ. Only `v` and `f` matter here — normals/UVs/materials are ignored
 * since the renderer derives its own shading. Faces may be n-gons, and
 * indices may be negative (relative to the end of the vertex list), both
 * of which appear in the catalog's source files.
 */
function parseOBJ(text) {
  const vx = [];
  const vy = [];
  const vz = [];
  const tris = [];

  const lines = text.split('\n');
  for (const line of lines) {
    if (line.length < 2) continue;
    const c0 = line[0];
    if (c0 === 'v' && (line[1] === ' ' || line[1] === '\t')) {
      const p = line.slice(2).trim().split(/\s+/);
      vx.push(parseFloat(p[0]));
      vy.push(parseFloat(p[1]));
      vz.push(parseFloat(p[2]));
    } else if (c0 === 'f' && (line[1] === ' ' || line[1] === '\t')) {
      const parts = line.slice(2).trim().split(/\s+/);
      const idx = [];
      for (const part of parts) {
        // "v", "v/vt", "v//vn", "v/vt/vn" — only the first field is used.
        const slash = part.indexOf('/');
        const rawStr = slash === -1 ? part : part.slice(0, slash);
        let raw = parseInt(rawStr, 10);
        if (Number.isNaN(raw)) continue;
        // OBJ is 1-based; negative means "counting back from the last
        // vertex parsed so far".
        idx.push(raw < 0 ? vx.length + raw : raw - 1);
      }
      // Fan-triangulate anything with more than 3 corners.
      for (let i = 1; i + 1 < idx.length; i++) {
        tris.push(idx[0], idx[i], idx[i + 1]);
      }
    }
  }

  const triangleCount = tris.length / 3;
  const positions = new Float32Array(triangleCount * 9);
  for (let t = 0; t < triangleCount; t++) {
    for (let k = 0; k < 3; k++) {
      const vi = tris[t * 3 + k];
      positions[t * 9 + k * 3 + 0] = vx[vi];
      positions[t * 9 + k * 3 + 1] = vy[vi];
      positions[t * 9 + k * 3 + 2] = vz[vi];
    }
  }
  return { positions, triangleCount };
}

function parseMesh(buf, format) {
  const mesh = format === 'obj' ? parseOBJ(buf.toString('utf8')) : parseSTL(buf);
  if (!mesh.triangleCount) {
    throw new Error(`parsed 0 triangles from a ${format} file`);
  }
  return mesh;
}

/** Axis-aligned bounds, used to centre and scale the model into frame. */
function bounds(positions) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/**
 * Approximate mesh volume via the signed-tetrahedron sum, and total
 * surface area. Both are in the file's own units (mm for essentially every
 * printable STL), so volume converts to cm³ by /1000. Feeds the seeded
 * ModelFile.volumeCm3 / surfaceAreaCm2 columns that the estimate service
 * reads, so seeded designs price like real uploads instead of falling
 * back to the file-size heuristic.
 */
function measure(positions, triangleCount) {
  let vol6 = 0;
  let area2 = 0;
  for (let t = 0; t < triangleCount; t++) {
    const o = t * 9;
    const ax = positions[o], ay = positions[o + 1], az = positions[o + 2];
    const bx = positions[o + 3], by = positions[o + 4], bz = positions[o + 5];
    const cx = positions[o + 6], cy = positions[o + 7], cz = positions[o + 8];

    vol6 += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);

    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    area2 += Math.sqrt(nx * nx + ny * ny + nz * nz);
  }
  return {
    volumeMm3: Math.abs(vol6) / 6,
    areaMm2: area2 / 2,
  };
}

module.exports = { parseMesh, parseOBJ, parseSTL, bounds, measure };
