'use strict';

// Software rasteriser: turns a parsed triangle soup into a shaded PNG
// preview. The whole point of this file is that the thumbnail is the
// actual geometry — the previous seeder attached stock photos keyed off a
// random product name, so a "bike" listing showed a photo of a bike and
// the STL behind it was a robot head. Rendering the real mesh means the
// image can't disagree with the model.
//
// Orthographic projection, z-buffered, flat-shaded off recomputed face
// normals with a key/fill/ambient rig. Supersampled and box-downsampled
// for edge quality.

const { bounds, measure } = require('./mesh');
const { encodePNG } = require('./png');

const SS = 3; // supersample factor per axis

// Studio-ish neutral backdrop, slightly darker at the bottom so the model
// reads as sitting in a space rather than floating on flat colour.
const BG_TOP = [244, 246, 249];
const BG_BOTTOM = [222, 226, 233];

function rotate(positions, upAxis, yaw, pitch) {
  const out = new Float32Array(positions.length);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const zUp = upAxis === 'z';

  for (let i = 0; i < positions.length; i += 3) {
    let x = positions[i], y = positions[i + 1], z = positions[i + 2];

    // Printable STLs are authored Z-up (the bed is the XY plane); the OBJ
    // art models are Y-up. Normalise to Y-up first so one camera rig
    // frames both sensibly.
    if (zUp) {
      const ny = z;
      const nz = -y;
      y = ny;
      z = nz;
    }

    // Yaw about Y, then pitch about X — a three-quarter view that shows
    // depth on almost any shape.
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;

    out[i] = x1;
    out[i + 1] = y2;
    out[i + 2] = z2;
  }
  return out;
}

function normalise(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * @param {{positions: Float32Array, triangleCount: number}} mesh
 * @param {object} opts  size, yaw/pitch in radians, upAxis, base colour
 * @returns {Buffer} PNG bytes
 */
function renderMesh(mesh, opts = {}) {
  const size = opts.size || 640;
  const yaw = opts.yaw !== undefined ? opts.yaw : Math.PI * 0.22;
  // Positive pitch tilts the camera above the horizon, so parts read as
  // sitting on a bed rather than being viewed from underneath.
  const pitch = opts.pitch !== undefined ? opts.pitch : Math.PI * 0.26;
  const upAxis = opts.upAxis || 'y';
  const colour = opts.colour || [214, 96, 32];

  const W = size * SS;
  const H = size * SS;

  const pos = rotate(mesh.positions, upAxis, yaw, pitch);
  const b = bounds(pos);

  const spanX = b.maxX - b.minX;
  const spanY = b.maxY - b.minY;
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const cz = (b.minZ + b.maxZ) / 2;

  // Fit the longest visible axis into the frame, leaving a margin so the
  // silhouette never touches the edge.
  const margin = 0.86;
  const scale = (Math.min(W, H) * margin) / Math.max(spanX, spanY, 1e-6);

  const colourBuf = Buffer.alloc(W * H * 3);
  const zbuf = new Float32Array(W * H).fill(-Infinity);

  // Vertical gradient backdrop.
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    const r = Math.round(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t);
    const g = Math.round(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t);
    const bl = Math.round(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t);
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      colourBuf[o] = r;
      colourBuf[o + 1] = g;
      colourBuf[o + 2] = bl;
    }
  }

  // Camera looks down -Z, so lights are given in view space.
  const key = normalise([-0.42, 0.68, 0.85]);
  const fill = normalise([0.6, 0.15, 0.5]);
  const AMBIENT = 0.34;

  const sx = (x) => (x - cx) * scale + W / 2;
  const sy = (y) => H / 2 - (y - cy) * scale;

  for (let t = 0; t < mesh.triangleCount; t++) {
    const o = t * 9;
    const ax = pos[o], ay = pos[o + 1], az = pos[o + 2];
    const bx = pos[o + 3], by = pos[o + 4], bz = pos[o + 5];
    const cx3 = pos[o + 6], cy3 = pos[o + 7], cz3 = pos[o + 8];

    // Face normal from the winding.
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx3 - ax, vy = cy3 - ay, vz = cz3 - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nlen = Math.hypot(nx, ny, nz);
    if (nlen < 1e-12) continue; // degenerate sliver
    nx /= nlen; ny /= nlen; nz /= nlen;

    // Two-sided lighting: many catalog meshes have inconsistent winding,
    // and back-face culling on those would punch holes in the silhouette.
    // Flipping the normal toward the camera instead keeps the surface
    // solid regardless of how the file was authored.
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }

    const lambert =
      AMBIENT +
      0.72 * Math.max(0, nx * key[0] + ny * key[1] + nz * key[2]) +
      0.22 * Math.max(0, nx * fill[0] + ny * fill[1] + nz * fill[2]);
    const shade = Math.min(1, lambert);

    const r = Math.min(255, colour[0] * shade);
    const g = Math.min(255, colour[1] * shade);
    const bb = Math.min(255, colour[2] * shade);

    const p0x = sx(ax), p0y = sy(ay);
    const p1x = sx(bx), p1y = sy(by);
    const p2x = sx(cx3), p2y = sy(cy3);

    let minX = Math.max(0, Math.floor(Math.min(p0x, p1x, p2x)));
    let maxX = Math.min(W - 1, Math.ceil(Math.max(p0x, p1x, p2x)));
    let minY = Math.max(0, Math.floor(Math.min(p0y, p1y, p2y)));
    let maxY = Math.min(H - 1, Math.ceil(Math.max(p0y, p1y, p2y)));
    if (minX > maxX || minY > maxY) continue;

    const denom = (p1y - p2y) * (p0x - p2x) + (p2x - p1x) * (p0y - p2y);
    if (Math.abs(denom) < 1e-12) continue;

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const fx = px + 0.5, fy = py + 0.5;
        const w0 = ((p1y - p2y) * (fx - p2x) + (p2x - p1x) * (fy - p2y)) / denom;
        const w1 = ((p2y - p0y) * (fx - p2x) + (p0x - p2x) * (fy - p2y)) / denom;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;

        const z = w0 * az + w1 * bz + w2 * cz3;
        const idx = py * W + px;
        if (z <= zbuf[idx]) continue;
        zbuf[idx] = z;
        const co = idx * 3;
        colourBuf[co] = r;
        colourBuf[co + 1] = g;
        colourBuf[co + 2] = bb;
      }
    }
  }

  // Box-downsample the supersampled buffer to the requested size.
  const out = Buffer.alloc(size * size * 3);
  const inv = 1 / (SS * SS);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b2 = 0;
      for (let dy = 0; dy < SS; dy++) {
        const row = (y * SS + dy) * W;
        for (let dx = 0; dx < SS; dx++) {
          const o = (row + x * SS + dx) * 3;
          r += colourBuf[o];
          g += colourBuf[o + 1];
          b2 += colourBuf[o + 2];
        }
      }
      const oo = (y * size + x) * 3;
      out[oo] = Math.round(r * inv);
      out[oo + 1] = Math.round(g * inv);
      out[oo + 2] = Math.round(b2 * inv);
    }
  }

  return encodePNG(size, size, out);
}

module.exports = { renderMesh, measure };
