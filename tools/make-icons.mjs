/**
 * Generates the PWA icon set from a single SVG source.
 * Run with:  node tools/make-icons.mjs
 * Writes PNG files with no external dependencies (zlib is built into Node).
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve(import.meta.dirname, '../assets/icons');
mkdirSync(outDir, { recursive: true });

/** Minimal PNG encoder: RGBA pixels, 8-bit, no interlacing. */
function encodePng(width, height, pixelAt) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    raw[pos] = 0; // filter: none
    pos += 1;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixelAt(x, y);
      raw[pos] = r; raw[pos + 1] = g; raw[pos + 2] = b; raw[pos + 3] = a;
      pos += 4;
    }
  }

  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

/** Brand colours: indigo → violet gradient with a graduation-cap glyph. */
const GRAD_FROM = [0x63, 0x5b, 0xff];
const GRAD_TO = [0x8b, 0x5c, 0xf6];

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Draws the icon procedurally.
 * @param {number} size
 * @param {boolean} maskable adds the safe-zone padding maskable icons need
 */
function makeIcon(size, maskable = false) {
  const inset = maskable ? Math.round(size * 0.14) : 0;
  const box = size - inset * 2;
  const radius = maskable ? 0 : Math.round(size * 0.22);

  // Cap geometry in unit space.
  const capTop = 0.34;
  const capHalf = 0.30;
  const capThick = 0.085;
  const boardTop = 0.52;
  const boardThick = 0.075;
  const tasselX = 0.30;
  const tasselBottom = 0.78;

  return encodePng(size, size, (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;

    // Rounded-corner mask.
    if (!maskable) {
      const cx = Math.min(Math.max(px, radius), size - radius);
      const cy = Math.min(Math.max(py, radius), size - radius);
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy > radius * radius) return [0, 0, 0, 0];
    }

    // Diagonal gradient background.
    const t = Math.min(1, Math.max(0, (px / size) * 0.55 + (py / size) * 0.45));
    const [r, g, b] = mix(GRAD_FROM, GRAD_TO, t);

    // Map into the (possibly padded) icon box.
    const u = (px - inset) / box;
    const v = (py - inset) / box;

    const white = [255, 255, 255, 255];

    // Mortarboard: diamond cap.
    if (v >= capTop && v <= capTop + capThick) {
      const mid = 0.42;
      const span = capHalf * (1 - Math.abs(v - (capTop + capThick / 2)) / (capThick / 2));
      if (Math.abs(u - mid) <= span) return white;
    }
    // Board under the cap.
    if (v >= boardTop && v <= boardTop + boardThick) {
      const mid = 0.44;
      const span = 0.24 * (1 - Math.abs(v - (boardTop + boardThick / 2)) / (boardThick / 2));
      if (Math.abs(u - mid) <= span) return white;
    }
    // Tassel line and drop.
    if (u >= tasselX - 0.018 && u <= tasselX + 0.018 && v > capTop + capThick && v < tasselBottom - 0.05) return white;
    if (v >= tasselBottom - 0.06 && v <= tasselBottom) {
      const d = Math.hypot(u - tasselX, v - (tasselBottom - 0.03));
      if (d <= 0.05) return white;
    }

    return [r, g, b, 255];
  });
}

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable.png', 512, true],
];

for (const [name, size, maskable] of targets) {
  const png = makeIcon(size, maskable);
  writeFileSync(path.join(outDir, name), png);
  console.log(`wrote ${name} (${size}×${size}, ${png.length} bytes)`);
}

// Scalable favicon for browsers that prefer it.
writeFileSync(path.join(outDir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#635bff"/><stop offset="1" stop-color="#8b5cf6"/>
  </linearGradient></defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  <path d="M50 34 80 44 50 54 20 44Z" fill="#fff"/>
  <path d="M44 49 26 43v14c0 4 8 7 14 7" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
  <path d="M74 47v12" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  <circle cx="74" cy="62" r="4" fill="#fff"/>
</svg>
`, 'utf8');
console.log('wrote favicon.svg');
