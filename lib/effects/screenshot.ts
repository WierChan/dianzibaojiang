import { createCanvas, ctx2d } from "./core";
import type { RNG } from "./random";

export interface ScreenshotOptions {
  /** Simulated device screen width in px. */
  screenWidth: number;
  dark?: boolean;
  rng: RNG;
}

/**
 * Re-frame the image as if someone screenshotted it on a phone:
 * scaled to the device width with a fake status bar on top.
 * The bar is meant to be cropped back off (imperfectly) by `crop`.
 */
export function simulateScreenshot(
  canvas: HTMLCanvasElement,
  opts: ScreenshotOptions,
): { canvas: HTMLCanvasElement; barHeight: number } {
  const { screenWidth, dark = true, rng } = opts;
  const sw = Math.max(64, Math.round(screenWidth));
  const scale = sw / canvas.width;
  const ih = Math.max(1, Math.round(canvas.height * scale));
  const barH = Math.round(sw * 0.045);
  const out = createCanvas(sw, ih + barH);
  const ctx = ctx2d(out);

  // Status bar
  ctx.fillStyle = dark ? "#0b0b0f" : "#f6f6f6";
  ctx.fillRect(0, 0, sw, barH);
  const fg = dark ? "rgba(255,255,255,0.92)" : "rgba(20,20,20,0.92)";
  ctx.fillStyle = fg;
  const fontPx = Math.max(8, Math.round(barH * 0.52));
  ctx.font = `${fontPx}px -apple-system, sans-serif`;
  ctx.textBaseline = "middle";
  const hh = rng.int(8, 23);
  const mm = rng.int(0, 59);
  ctx.fillText(`${hh}:${String(mm).padStart(2, "0")}`, Math.round(sw * 0.045), barH / 2);
  // Battery
  const bw = Math.round(barH * 0.95);
  const bh = Math.round(barH * 0.42);
  const bx = sw - Math.round(sw * 0.04) - bw;
  const by = Math.round((barH - bh) / 2);
  ctx.strokeStyle = fg;
  ctx.lineWidth = Math.max(1, Math.round(barH * 0.05));
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillRect(bx + 2, by + 2, Math.round((bw - 4) * rng.range(0.15, 0.95)), bh - 4);
  // Signal dots
  const dot = Math.max(1, Math.round(barH * 0.12));
  for (let k = 0; k < 4; k++) {
    ctx.fillRect(bx - (k + 2) * dot * 2, barH / 2 + dot, dot, -dot * (k + 1));
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  ctx.drawImage(canvas, 0, barH, sw, ih);
  return { canvas: out, barHeight: barH };
}

/** Crop pixels off each edge. */
export function crop(
  canvas: HTMLCanvasElement,
  left: number,
  top: number,
  right: number,
  bottom: number,
): HTMLCanvasElement {
  const l = Math.max(0, Math.round(left));
  const t = Math.max(0, Math.round(top));
  const w = canvas.width - l - Math.max(0, Math.round(right));
  const h = canvas.height - t - Math.max(0, Math.round(bottom));
  if (w <= 0 || h <= 0) return canvas;
  if (l === 0 && t === 0 && w === canvas.width && h === canvas.height) return canvas;
  const out = createCanvas(w, h);
  ctx2d(out).drawImage(canvas, l, t, w, h, 0, 0, w, h);
  return out;
}
