import { ctx2d } from "./core";
import { clamp } from "./random";

function buildLUT(offset: number, gain = 1): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = clamp((v - 128) * gain + 128 + offset, 0, 255);
  return lut;
}

function applyLUTs(
  canvas: HTMLCanvasElement,
  lr: Uint8ClampedArray,
  lg: Uint8ClampedArray,
  lb: Uint8ClampedArray,
): HTMLCanvasElement {
  const ctx = ctx2d(canvas, true);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lr[d[i]];
    d[i + 1] = lg[d[i + 1]];
    d[i + 2] = lb[d[i + 2]];
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Shift each channel by a small offset (-255..255). ±3% ≈ ±8. */
export function shiftColors(
  canvas: HTMLCanvasElement,
  dr: number,
  dg: number,
  db: number,
): HTMLCanvasElement {
  if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) < 1) return canvas;
  return applyLUTs(canvas, buildLUT(dr), buildLUT(dg), buildLUT(db));
}

/** The unmistakable cold blue cast of 2008-era chat clients. strength 0..1. */
export function blueTint(canvas: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  if (strength <= 0.01) return canvas;
  return applyLUTs(
    canvas,
    buildLUT(-10 * strength, 1 - 0.03 * strength),
    buildLUT(2 * strength),
    buildLUT(14 * strength, 1 + 0.02 * strength),
  );
}

/**
 * The legendary Tieba green cast — chroma-plane corruption from
 * broken YUV round-trips made whole images drift sickly green.
 * strength 0..1.
 */
export function greenTint(canvas: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  if (strength <= 0.01) return canvas;
  return applyLUTs(
    canvas,
    buildLUT(-9 * strength, 1 - 0.02 * strength),
    buildLUT(16 * strength, 1 + 0.03 * strength),
    buildLUT(-13 * strength, 1 - 0.03 * strength),
  );
}

/** Saturation multiplier; factor < 1 gives the reposted washout look. */
export function saturate(canvas: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  if (Math.abs(factor - 1) < 0.01) return canvas;
  const ctx = ctx2d(canvas, true);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    d[i] = luma + (r - luma) * factor;
    d[i + 1] = luma + (g - luma) * factor;
    d[i + 2] = luma + (b - luma) * factor;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Horizontal RGB channel misalignment, like a bad screen photo. */
export function chromaticAberration(
  canvas: HTMLCanvasElement,
  shiftPx: number,
): HTMLCanvasElement {
  const px = Math.round(shiftPx);
  if (px === 0) return canvas;
  const { width: w, height: h } = canvas;
  const ctx = ctx2d(canvas, true);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = (row + x) * 4;
      const xr = clamp(x - px, 0, w - 1);
      const xb = clamp(x + px, 0, w - 1);
      d[i] = src[(row + xr) * 4];
      d[i + 2] = src[(row + xb) * 4 + 2];
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
