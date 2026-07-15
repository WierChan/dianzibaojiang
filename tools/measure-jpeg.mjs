#!/usr/bin/env node
/**
 * measure-jpeg — read what a platform actually did to an image.
 *
 * Parses the JPEG bitstream (no dependencies) and reports the objective
 * degradation fingerprint you need to calibrate the patina pipeline against
 * real samples:
 *   • quantization tables (DQT) → estimated encode quality
 *   • component sampling factors (SOF) → chroma subsampling (4:4:4 / 4:2:2 / 4:2:0)
 *   • dimensions
 *
 * Workflow: round-trip a real image through WeChat / Tieba / QQ (upload,
 * then save the result), run this on the saved file, and tune the preset's
 * `quality` and `degradeChroma` params to the numbers it reports — instead
 * of eyeballing them.
 *
 * Usage:  node tools/measure-jpeg.mjs <file.jpg> [more.jpg ...]
 */

import { readFileSync } from "node:fs";

// Annex-K standard tables (raster order), the base libjpeg scales by quality.
// prettier-ignore
const STD_LUMA = [
  16,11,10,16,24,40,51,61, 12,12,14,19,26,58,60,55,
  14,13,16,24,40,57,69,56, 14,17,22,29,51,87,80,62,
  18,22,37,56,68,109,103,77, 24,35,55,64,81,104,113,92,
  49,64,78,87,103,121,120,101, 72,92,95,98,112,100,103,99,
];
// prettier-ignore
const STD_CHROMA = [
  17,18,24,47,99,99,99,99, 18,21,26,66,99,99,99,99,
  24,26,56,99,99,99,99,99, 47,66,99,99,99,99,99,99,
  99,99,99,99,99,99,99,99, 99,99,99,99,99,99,99,99,
  99,99,99,99,99,99,99,99, 99,99,99,99,99,99,99,99,
];
// prettier-ignore
const ZIGZAG = [
  0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,7,14,21,28,
  35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63,
];

// Std table reordered into the zigzag sequence the file stores, so file[i]
// pairs directly with the standard coefficient at the same stream position.
const stdZig = (std) => ZIGZAG.map((r) => std[r]);

/**
 * Invert libjpeg's quality→scale→table mapping per coefficient and average,
 * giving the quality that best explains this table (assuming standard bases).
 */
function estimateQuality(table, std) {
  const sz = stdZig(std);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < 64; i++) {
    const q = table[i];
    const base = sz[i];
    if (q <= 0 || q >= 255 || base <= 0) continue; // skip saturated/degenerate
    sum += (q * 100) / base; // ≈ scale libjpeg applied
    count++;
  }
  if (!count) return null;
  const scale = sum / count;
  const quality = scale <= 100 ? (200 - scale) / 2 : 5000 / scale;
  return Math.max(1, Math.min(100, Math.round(quality)));
}

function subsamplingName(components) {
  const y = components[0];
  if (!y) return "unknown";
  const hy = y.h;
  const vy = y.v;
  if (hy === 1 && vy === 1) return "4:4:4 (no chroma loss)";
  if (hy === 2 && vy === 1) return "4:2:2 (horizontal half)";
  if (hy === 2 && vy === 2) return "4:2:0 (quarter chroma)";
  if (hy === 1 && vy === 2) return "4:4:0";
  return `${hy}x${vy}`;
}

// Minimal EXIF reader: pull Make / Model / DateTimeOriginal out of an APP1.
function parseExif(seg) {
  if (seg.length < 14 || String.fromCharCode(seg[0], seg[1], seg[2], seg[3]) !== "Exif") return null;
  const tiff = 6;
  const be = seg[tiff] === 0x4d;
  const u16 = (o) => (be ? (seg[o] << 8) | seg[o + 1] : (seg[o + 1] << 8) | seg[o]);
  const u32 = (o) =>
    be
      ? ((seg[o] << 24) | (seg[o + 1] << 16) | (seg[o + 2] << 8) | seg[o + 3]) >>> 0
      : ((seg[o + 3] << 24) | (seg[o + 2] << 16) | (seg[o + 1] << 8) | seg[o]) >>> 0;
  const str = (o, n) => {
    let s = "";
    for (let i = 0; i < n && seg[tiff + o + i]; i++) s += String.fromCharCode(seg[tiff + o + i]);
    return s;
  };
  const out = {};
  const readIFD = (ifdOff) => {
    const base = tiff + ifdOff;
    const n = u16(base);
    for (let i = 0; i < n; i++) {
      const e = base + 2 + i * 12;
      const tag = u16(e);
      const count = u32(e + 4);
      const valOff = e + 8;
      if (tag === 0x010f) out.make = str(u32(valOff), count);
      else if (tag === 0x0110) out.model = str(u32(valOff), count);
      else if (tag === 0x0132) out.dateTime = str(u32(valOff), count);
      else if (tag === 0x8769) readIFD(u32(valOff)); // Exif sub-IFD
      else if (tag === 0x9003) out.dateTimeOriginal = str(u32(valOff), count);
    }
  };
  readIFD(u32(tiff + 4));
  return out;
}

function parse(buf) {
  const tables = []; // { id, values[64] }
  let width = 0;
  let height = 0;
  let components = [];
  let exif = null;
  let p = 2; // skip SOI
  while (p < buf.length - 1) {
    if (buf[p] !== 0xff) {
      p++;
      continue;
    }
    const marker = buf[p + 1];
    if (marker === 0xd9 || marker === 0xda) break; // EOI / start of scan
    const len = (buf[p + 2] << 8) | buf[p + 3];
    const seg = p + 4;
    if (marker === 0xe1) {
      exif = parseExif(buf.subarray(seg, seg + len - 2));
    } else if (marker === 0xdb) {
      // DQT — may pack several tables
      let q = seg;
      while (q < seg + len - 2) {
        const prec = buf[q] >> 4;
        const id = buf[q] & 0x0f;
        q++;
        const values = [];
        for (let i = 0; i < 64; i++) {
          if (prec) {
            values.push((buf[q] << 8) | buf[q + 1]);
            q += 2;
          } else {
            values.push(buf[q]);
            q += 1;
          }
        }
        tables.push({ id, values });
      }
    } else if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      // SOF (frame header)
      height = (buf[seg + 1] << 8) | buf[seg + 2];
      width = (buf[seg + 3] << 8) | buf[seg + 4];
      const n = buf[seg + 5];
      components = [];
      for (let c = 0; c < n; c++) {
        const o = seg + 6 + c * 3;
        components.push({ id: buf[o], h: buf[o + 1] >> 4, v: buf[o + 1] & 0x0f, tq: buf[o + 2] });
      }
    }
    p = seg + len - 2;
  }
  return { width, height, components, tables, exif };
}

function report(file) {
  const buf = readFileSync(file);
  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    console.log(`${file}: not a JPEG`);
    return;
  }
  const { width, height, components, tables, exif } = parse(buf);
  const luma = tables.find((t) => t.id === 0);
  const chroma = tables.find((t) => t.id === 1);
  const qLuma = luma ? estimateQuality(luma.values, STD_LUMA) : null;
  const qChroma = chroma ? estimateQuality(chroma.values, STD_CHROMA) : null;
  const sum = (t) => t.values.reduce((a, b) => a + b, 0);

  console.log(`\n${file}`);
  console.log(`  size            ${width}×${height}`);
  console.log(`  subsampling     ${subsamplingName(components)}`);
  console.log(`  est. quality    luma ${qLuma ?? "?"}   chroma ${qChroma ?? "?"}`);
  if (luma) console.log(`  DQT sum         luma ${sum(luma)}${chroma ? `   chroma ${sum(chroma)}` : ""}`);
  if (exif) {
    const cam = [exif.make, exif.model].filter(Boolean).join(" ");
    console.log(`  EXIF camera     ${cam || "—"}`);
    console.log(`  EXIF shot at    ${exif.dateTimeOriginal || exif.dateTime || "—"}`);
  } else {
    console.log(`  EXIF            none`);
  }
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: node tools/measure-jpeg.mjs <file.jpg> [...]");
  process.exit(1);
}
for (const f of files) {
  try {
    report(f);
  } catch (e) {
    console.log(`${f}: ${e.message}`);
  }
}
