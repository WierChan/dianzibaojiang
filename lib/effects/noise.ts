import { ctx2d } from "./core";
import { mulberry32 } from "./random";

/**
 * Add sensor/compression style noise.
 * amountPct: perceptual strength in percent (1–3% is typical wear).
 * mono: luminance-only noise (true) vs per-channel color noise (false).
 */
export function addNoise(
  canvas: HTMLCanvasElement,
  amountPct: number,
  seed: number,
  mono = true,
): HTMLCanvasElement {
  if (amountPct <= 0.03) return canvas;
  const ctx = ctx2d(canvas, true);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const rand = mulberry32(seed);
  const amp = (amountPct / 100) * 255;
  if (mono) {
    for (let i = 0; i < d.length; i += 4) {
      const n = (rand() * 2 - 1) * amp;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
  } else {
    const camp = amp * 0.75;
    for (let i = 0; i < d.length; i += 4) {
      d[i] += (rand() * 2 - 1) * camp;
      d[i + 1] += (rand() * 2 - 1) * camp;
      d[i + 2] += (rand() * 2 - 1) * camp;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
