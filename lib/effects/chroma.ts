/**
 * Chroma-plane degradation — the *real* mechanism behind color rot.
 *
 * JPEG and every chat/forum re-encode live in YCbCr, not RGB. Color damage
 * (the Tieba green, muddy reposts, chroma bleed) happens in the Cb/Cr planes
 * while luma survives. Modeling it as an RGB tint is a costume; modeling it
 * in YCbCr is the thing itself. Two primitives here:
 *
 *   jpegGreenPass  — reproduces the fixed-point integer YUV↔RGB round-trip
 *                    whose truncation + −1 chroma bias drifts colors green on
 *                    every decode (the "JPEGreen" bug). Accumulate across
 *                    reposts like the real thing did.
 *   degradeChroma  — collapses chroma resolution into blocks, quantizes it to
 *                    bands, and biases it, the way repeated 4:2:0 subsampling
 *                    does. Luma is untouched.
 */

import { ctx2d } from "./core";

const clip8 = (x: number): number => (x < 0 ? 0 : x > 255 ? 255 : x);
const clipC = (x: number): number => (x < -128 ? -128 : x > 127 ? 127 : x);

/**
 * The authentic green drift. This is a bit-exact reproduction of the
 * fixed-point BT.601 RGB→YUV→RGB conversion shipped in some
 * libjpeg-turbo / Skia builds: integer coefficients, `>>` truncation
 * (floor, so a systematic downward bias), and a −1 nudge on both chroma
 * channels. One decode is nearly invisible; a repost chain ran it over
 * and over, and the error marched the whole image green.
 *
 * Deterministic on purpose — a broken codec has no RNG. Pass `rounds`
 * to compound it the way transfers did.
 */
export function jpegGreenPass(canvas: HTMLCanvasElement, rounds = 1): HTMLCanvasElement {
  if (rounds < 1) return canvas;
  const ctx = ctx2d(canvas, true);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let pass = 0; pass < rounds; pass++) {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const y = clip8((77 * r + 150 * g + 29 * b) >> 8);
      const u = clipC(((-43 * r - 85 * g + 128 * b) >> 8) - 1);
      const v = clipC(((128 * r - 107 * g - 21 * b) >> 8) - 1);
      d[i] = clip8((65536 * y + 91881 * v) >> 16);
      d[i + 1] = clip8((65536 * y - 22553 * u - 46802 * v) >> 16);
      d[i + 2] = clip8((65536 * y + 116130 * u) >> 16);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export interface ChromaDamageOptions {
  /** Chroma block size in px. 2 ≈ 4:2:0; larger = coarser bleed. */
  sub?: number;
  /** Quantization step for Cb/Cr. 1 = none; higher = visible color banding. */
  quant?: number;
  /** Constant Cb/Cr offset. Negative on both nudges the cast toward green. */
  biasCb?: number;
  biasCr?: number;
}

/**
 * Corrupt only the chroma planes: block-average Cb/Cr (resolution loss +
 * bleed across edges), quantize them (color banding), and bias them (cast).
 * Luma is preserved, so detail stays but the color goes to mud — exactly
 * what repeated subsampling does, and the honest way to make a whole image
 * "go green" without touching what the shapes look like.
 */
export function degradeChroma(
  canvas: HTMLCanvasElement,
  { sub = 2, quant = 1, biasCb = 0, biasCr = 0 }: ChromaDamageOptions = {},
): HTMLCanvasElement {
  const { width: w, height: h } = canvas;
  const ctx = ctx2d(canvas, true);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;

  const Y = new Float32Array(n);
  const Cb = new Float32Array(n);
  const Cr = new Float32Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    Y[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    Cb[p] = -0.168736 * r - 0.331264 * g + 0.5 * b;
    Cr[p] = 0.5 * r - 0.418688 * g - 0.081312 * b;
  }

  const s = Math.max(1, Math.round(sub));
  const q = Math.max(1, quant);

  // Walk chroma blocks: average → bias → quantize → paint back over the
  // untouched luma. Nearest-replicate upsample leaves the blocky color grid.
  for (let by = 0; by < h; by += s) {
    const yEnd = Math.min(by + s, h);
    for (let bx = 0; bx < w; bx += s) {
      const xEnd = Math.min(bx + s, w);
      let sumCb = 0;
      let sumCr = 0;
      let cnt = 0;
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const p = y * w + x;
          sumCb += Cb[p];
          sumCr += Cr[p];
          cnt++;
        }
      }
      let cb = sumCb / cnt + biasCb;
      let cr = sumCr / cnt + biasCr;
      if (q > 1) {
        cb = Math.round(cb / q) * q;
        cr = Math.round(cr / q) * q;
      }
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const p = y * w + x;
          const i = p * 4;
          const yy = Y[p];
          d[i] = clip8(yy + 1.402 * cr);
          d[i + 1] = clip8(yy - 0.344136 * cb - 0.714136 * cr);
          d[i + 2] = clip8(yy + 1.772 * cb);
        }
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}
