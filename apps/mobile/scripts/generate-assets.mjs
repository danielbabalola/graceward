/**
 * Generates temporary, TestFlight-ready Graceward app assets as PNGs using only
 * Node built-ins (no design dependencies, no network). The motif is a calm,
 * minimal dawn: a soft-gold sun rising over a cream horizon under a navy sky.
 *
 * These are placeholder brand assets, not final artwork. Re-run with:
 *   node apps/mobile/scripts/generate-assets.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

// Graceward palette.
const SKY_BLUE = [0xdf, 0xf3, 0xff];
const NAVY = [0x12, 0x32, 0x4a];
const CREAM = [0xff, 0xf8, 0xee];
const GOLD = [0xd6, 0xa8, 0x4f];

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [
  lerp(c1[0], c2[0], t),
  lerp(c1[1], c2[1], t),
  lerp(c1[2], c2[2], t),
];
const smoothstep = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

// ----- PNG encoding (zlib only) -----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(width, height, rgba, hasAlpha) {
  const channels = hasAlpha ? 4 : 3;
  const raw = Buffer.alloc(height * (1 + width * channels));
  let pos = 0;
  for (let y = 0; y < height; y++) {
    raw[pos++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw[pos++] = rgba[i];
      raw[pos++] = rgba[i + 1];
      raw[pos++] = rgba[i + 2];
      if (hasAlpha) raw[pos++] = rgba[i + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = hasAlpha ? 6 : 2; // color type: 6=RGBA, 2=RGB
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Renders the dawn scene. The vertical layout uses normalized v (0 top, 1
 * bottom); the sun is measured in pixels so it stays perfectly round on any
 * aspect ratio. Returns a Uint8 RGBA buffer.
 */
function renderScene(width, height) {
  const out = new Uint8Array(width * height * 4);
  const horizonV = 0.64;
  const cx = width * 0.5;
  const cy = height * horizonV;
  const minDim = Math.min(width, height);
  const rSun = minDim * 0.17;
  const feather = Math.max(1, minDim * 0.0025);
  const lineHalf = Math.max(1, minDim * 0.004);

  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      let col;
      if (v < horizonV) {
        const t = clamp01(v / horizonV);
        col = mix(NAVY, SKY_BLUE, smoothstep(0, 1, Math.pow(t, 0.85)));
      } else {
        const tg = clamp01((v - horizonV) / (1 - horizonV));
        col = mix(CREAM, [0xf2, 0xe6, 0xd2], tg * 0.45);
      }

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Soft glow around the sun.
      const glow = 1 - smoothstep(rSun, rSun + minDim * 0.16, dist);
      col = mix(col, GOLD, glow * 0.22);

      // Thin gold horizon line.
      const lineCov =
        1 - smoothstep(lineHalf, lineHalf + feather, Math.abs(y - cy));
      col = mix(col, GOLD, lineCov * 0.55);

      // Sun disk with a subtle lighter core.
      const disk = 1 - smoothstep(rSun - feather, rSun + feather, dist);
      const sunColor = mix(GOLD, [0xe7, 0xc4, 0x82], 1 - clamp01(dist / rSun));
      col = mix(col, sunColor, disk);

      const i = (y * width + x) * 4;
      out[i] = Math.round(col[0]);
      out[i + 1] = Math.round(col[1]);
      out[i + 2] = Math.round(col[2]);
      out[i + 3] = 255;
    }
  }
  return out;
}

function writeAsset(name, width, height, hasAlpha) {
  const rgba = renderScene(width, height);
  const png = encodePng(width, height, rgba, hasAlpha);
  const path = join(ASSETS_DIR, name);
  writeFileSync(path, png);
  console.log(`wrote ${name} (${width}x${height}, ${png.length} bytes)`);
}

mkdirSync(ASSETS_DIR, { recursive: true });
writeAsset("app-icon.png", 1024, 1024, false);
writeAsset("splash.png", 1284, 2778, false);
writeAsset("adaptive-icon.png", 1024, 1024, false);
writeAsset("favicon.png", 48, 48, false);
console.log("Done. Temporary placeholder assets generated.");
