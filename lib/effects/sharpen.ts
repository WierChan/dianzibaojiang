import { ctx2d } from "./core";

/**
 * Unsharp-mask style sharpen (3x3 laplacian kernel).
 * amount ~0.3 is subtle, ~1.2 is the crunchy over-sharpened forum look.
 */
export function sharpen(canvas: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  if (amount <= 0.02) return canvas;
  const { width: w, height: h } = canvas;
  const ctx = ctx2d(canvas, true);
  const img = ctx.getImageData(0, 0, w, h);
  const s = img.data;
  const out = new Uint8ClampedArray(s.length);
  const a = amount;
  const center = 1 + 4 * a;
  for (let y = 0; y < h; y++) {
    const up = (y > 0 ? y - 1 : 0) * w;
    const dn = (y < h - 1 ? y + 1 : y) * w;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const lf = x > 0 ? x - 1 : 0;
      const rt = x < w - 1 ? x + 1 : x;
      const i = (row + x) * 4;
      const iu = (up + x) * 4;
      const id = (dn + x) * 4;
      const il = (row + lf) * 4;
      const ir = (row + rt) * 4;
      out[i] = center * s[i] - a * (s[iu] + s[id] + s[il] + s[ir]);
      out[i + 1] = center * s[i + 1] - a * (s[iu + 1] + s[id + 1] + s[il + 1] + s[ir + 1]);
      out[i + 2] = center * s[i + 2] - a * (s[iu + 2] + s[id + 2] + s[il + 2] + s[ir + 2]);
      out[i + 3] = s[i + 3];
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
  return canvas;
}
