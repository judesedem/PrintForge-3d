'use strict';

// Synthetic profile-picture generator — a solid-colour circle with the
// person's initials, the same visual language MemberDashboard/profile.tsx
// already falls back to for users with no photo (see ProfileScreen's
// getInitial() + avatarInitials styling). Deliberately not a stock photo of
// a real stranger: attaching someone else's photo to a fictional seeded
// name is a representation problem even under a CC0 licence, whereas a
// generated initials-avatar is consistent with the app's own design
// language and carries no such risk. Still uploaded through the real
// POST /api/files/upload/image → Cloudinary pipeline, so it exercises the
// real path exactly like a genuine user's avatar upload would.
//
// No runtime dependencies, matching the rest of this seeder — just the PNG
// encoder already here plus a tiny embedded 5x7 bitmap font for A-Z.

const { encodePNG } = require('./png');

// 5 columns x 7 rows, MSB-first per row, only the letters actually needed
// for two-initial monograms (A-Z). Compact classic "LED sign" style font.
const FONT = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
};

// A small, deliberately non-neon palette — the kind of muted, confident
// colours a real product would pick for avatar backgrounds, not random
// fully-saturated RGB.
const PALETTE = [
  [0xE0, 0x6B, 0x2A], // burnt orange
  [0x2E, 0x6F, 0x8E], // slate blue
  [0x3E, 0x8C, 0x5A], // forest green
  [0x9B, 0x4D, 0x6F], // plum
  [0xC4, 0x8A, 0x2E], // ochre
  [0x5A, 0x5F, 0x8C], // indigo grey
  [0xA8, 0x4A, 0x3A], // brick
  [0x3F, 0x9E, 0x9B], // teal
];

/** Deterministic 32-bit hash so the same name always gets the same colour. */
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function initialsOf(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Squared distance from (x, y) to the circle's centre, for a simple disc mask. */
function inCircle(x, y, cx, cy, r) {
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Renders a size x size RGB avatar: a solid-colour disc on a slightly
 * darker square backdrop, with the person's initials centred in white
 * using the embedded bitmap font, scaled up with nearest-neighbour so it
 * reads clearly at typical avatar sizes (the Cloudinary/thumbnail path
 * this feeds into already downsizes for display, so crisp large blocks
 * survive that better than fine detail would).
 */
function renderAvatar(fullName, size = 256) {
  const colour = PALETTE[hashString(fullName) % PALETTE.length];
  const bgShade = colour.map((c) => Math.max(0, Math.round(c * 0.35)));
  const rgb = Buffer.alloc(size * size * 3);

  const cx = size / 2, cy = size / 2, r = size * 0.46;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      const px = inCircle(x, y, cx, cy, r) ? colour : bgShade;
      rgb[i] = px[0]; rgb[i + 1] = px[1]; rgb[i + 2] = px[2];
    }
  }

  const initials = initialsOf(fullName);
  const glyphW = 5, glyphH = 7;
  const scale = Math.round(size / 11); // two glyphs + gap fit comfortably at this scale
  const gap = Math.round(scale * 1.2);
  const totalW = initials.length * glyphW * scale + (initials.length - 1) * gap;
  const totalH = glyphH * scale;
  const startX = Math.round(cx - totalW / 2);
  const startY = Math.round(cy - totalH / 2);

  for (let ci = 0; ci < initials.length; ci++) {
    const rows = FONT[initials[ci]];
    if (!rows) continue;
    const glyphX = startX + ci * (glyphW * scale + gap);
    for (let row = 0; row < glyphH; row++) {
      const bits = rows[row];
      for (let col = 0; col < glyphW; col++) {
        if (!((bits >> (glyphW - 1 - col)) & 1)) continue;
        const px0 = glyphX + col * scale;
        const py0 = startY + row * scale;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const x = px0 + dx, y = py0 + dy;
            if (x < 0 || y < 0 || x >= size || y >= size) continue;
            const i = (y * size + x) * 3;
            rgb[i] = 0xff; rgb[i + 1] = 0xff; rgb[i + 2] = 0xff;
          }
        }
      }
    }
  }

  return encodePNG(size, size, rgb);
}

module.exports = { renderAvatar, initialsOf };
