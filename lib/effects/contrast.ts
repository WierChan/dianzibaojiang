import { ctx2d } from "./core";
import { clamp } from "./random";

/**
 * Linear contrast/brightness adjustment via LUT.
 * factor 1 = unchanged, < 1 flattens (the tired reposted look).
 */
export function adjustContrast(
  canvas: HTMLCanvasElement,
  factor: number,
  brightness = 0,
): HTMLCanvasElement {
  if (Math.abs(factor - 1) < 0.005 && Math.abs(brightness) < 0.5) return canvas;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    lut[v] = clamp((v - 128) * factor + 128 + brightness, 0, 255);
  }
  const ctx = ctx2d(canvas, true);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** amount 0..1 → progressively flatter, slightly lifted blacks. */
export function reduceContrast(canvas: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  return adjustContrast(canvas, 1 - amount * 0.35, amount * 6);
}
