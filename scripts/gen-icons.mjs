#!/usr/bin/env node
/*
 * Génère les icônes de l'appli (PNG) sans dépendance : rendu par champ de distance
 * signé avec anticrénelage, encodage PNG via zlib.
 *   npm run icons
 * Emblème original : hexagone tactique cyan, réticule orange, fond bleu nuit.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const CYAN = [46, 230, 230];
const ORANGE = [255, 138, 31];
const BG_TOP = [12, 20, 30];
const BG_BOTTOM = [4, 7, 11];

/* ---- Géométrie (coordonnées normalisées 0..1) ---- */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function render(size, { scale = 1, rounded = 0 } = {}) {
  const px = new Uint8Array(size * size * 4);
  const s = scale; // échelle du motif (zone sûre pour les icônes masquables)
  const hex = hexPoints(0.5, 0.5, 0.36 * s);
  const stroke = 0.028 * s;
  const aa = 1.2 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size, v = (y + 0.5) / size;
      // Fond dégradé + halo
      const k = v;
      let col = BG_TOP.map((c, i) => c * (1 - k) + BG_BOTTOM[i] * k);
      const glow = Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.42) / 0.55);
      col = col.map((c, i) => c + CYAN[i] * 0.1 * glow * glow);
      // Grille discrète
      const g = 1 / 12;
      const gx = Math.abs(((u % g) + g) % g - g / 2), gy = Math.abs(((v % g) + g) % g - g / 2);
      if (Math.min(g / 2 - gx, g / 2 - gy) < 0.5 / size) col = col.map((c, i) => c + CYAN[i] * 0.04);

      const blend = (color, alpha) => {
        col = col.map((c, i) => c * (1 - alpha) + color[i] * alpha);
      };
      // Hexagone
      let dHex = Infinity;
      for (let i = 0; i < 6; i++) {
        const [ax, ay] = hex[i], [bx, by] = hex[(i + 1) % 6];
        dHex = Math.min(dHex, segDist(u, v, ax, ay, bx, by));
      }
      const aHex = Math.max(0, Math.min(1, (stroke / 2 - dHex) / aa + 0.5));
      // Halo de l'hexagone
      const halo = Math.max(0, 1 - dHex / (0.06 * s)) * 0.25;
      blend(CYAN, halo);
      blend(CYAN, aHex);
      // Cercle central
      const dCirc = Math.abs(Math.hypot(u - 0.5, v - 0.5) - 0.085 * s);
      blend(CYAN, Math.max(0, Math.min(1, (stroke / 2 - dCirc) / aa + 0.5)));
      // Réticule orange
      const arms = [
        [0.5, 0.5 - 0.25 * s, 0.5, 0.5 - 0.14 * s],
        [0.5, 0.5 + 0.14 * s, 0.5, 0.5 + 0.25 * s],
        [0.5 - 0.25 * s, 0.5, 0.5 - 0.14 * s, 0.5],
        [0.5 + 0.14 * s, 0.5, 0.5 + 0.25 * s, 0.5],
      ];
      let dArm = Infinity;
      for (const a of arms) dArm = Math.min(dArm, segDist(u, v, ...a));
      blend(ORANGE, Math.max(0, Math.min(1, (stroke * 0.55 - dArm) / aa + 0.5)));

      // Coins arrondis (icône non masquable)
      let alpha = 1;
      if (rounded > 0) {
        const r = rounded;
        const cx = Math.min(Math.max(u, r), 1 - r), cy = Math.min(Math.max(v, r), 1 - r);
        const d = Math.hypot(u - cx, v - cy) - r;
        alpha = Math.max(0, Math.min(1, -d / aa + 0.5));
      }
      const o = (y * size + x) * 4;
      px[o] = Math.round(Math.min(255, col[0]));
      px[o + 1] = Math.round(Math.min(255, col[1]));
      px[o + 2] = Math.round(Math.min(255, col[2]));
      px[o + 3] = Math.round(alpha * 255);
    }
  }
  return encodePNG(size, size, px);
}

/* ---- Encodeur PNG minimal ---- */
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync(join(OUT, 'icon-192.png'), render(192, { rounded: 0.18 }));
writeFileSync(join(OUT, 'icon-512.png'), render(512, { rounded: 0.18 }));
writeFileSync(join(OUT, 'maskable-512.png'), render(512, { scale: 0.78 }));
writeFileSync(join(OUT, 'apple-touch-icon.png'), render(180, { scale: 0.9 }));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c141e"/><stop offset="1" stop-color="#04070b"/></linearGradient></defs>
  <rect width="64" height="64" rx="12" fill="url(#bg)"/>
  <path d="M32 9 51.9 20.5v23L32 55 12.1 43.5v-23z" fill="none" stroke="#2ee6e6" stroke-width="3"/>
  <circle cx="32" cy="32" r="5.4" fill="none" stroke="#2ee6e6" stroke-width="3"/>
  <path d="M32 16v7M32 41v7M16 32h7M41 32h7" stroke="#ff8a1f" stroke-width="3" stroke-linecap="round"/>
</svg>
`;
writeFileSync(join(OUT, 'icon.svg'), svg);
console.log('Icônes générées dans public/icons/');
