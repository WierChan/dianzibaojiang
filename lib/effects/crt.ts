import { gaussianBlur } from "./blur";
import { cloneCanvas, createCanvas, ctx2d } from "./core";

export interface CRTOptions {
  /** Blur radius in px for phosphor softness. */
  softness?: number;
  /** 0..1 opacity of horizontal scanlines. */
  scanlineAlpha?: number;
  /** Scanline pitch in px. */
  scanlinePitch?: number;
  /** 0..1 strength of highlight bloom. */
  bloom?: number;
}

/** Old CRT monitor: soft phosphor glow, faint scanlines, blooming highlights. */
export function simulateCRT(canvas: HTMLCanvasElement, opts: CRTOptions): HTMLCanvasElement {
  const { softness = 0, scanlineAlpha = 0, scanlinePitch = 3, bloom = 0 } = opts;
  let out = canvas;
  if (softness > 0.05) out = gaussianBlur(out, softness);
  const ctx = ctx2d(out);
  if (bloom > 0.01) {
    const glow = gaussianBlur(cloneCanvas(out), Math.max(2, Math.min(out.width, out.height) * 0.006));
    ctx.save();
    ctx.globalAlpha = bloom * 0.5;
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(glow, 0, 0);
    ctx.restore();
  }
  if (scanlineAlpha > 0.005) {
    const pitch = Math.max(2, Math.round(scanlinePitch));
    const tile = createCanvas(1, pitch);
    const tctx = ctx2d(tile);
    tctx.fillStyle = `rgba(0,0,0,${scanlineAlpha})`;
    tctx.fillRect(0, pitch - 1, 1, 1);
    const pattern = ctx.createPattern(tile, "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, out.width, out.height);
    }
  }
  return out;
}

/** Faint vertical RGB subpixel stripes, like a photo of an LCD panel. */
export function simulateLCD(canvas: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  if (strength <= 0.01) return canvas;
  const tile = createCanvas(3, 1);
  const tctx = ctx2d(tile);
  tctx.fillStyle = "rgb(255,64,64)";
  tctx.fillRect(0, 0, 1, 1);
  tctx.fillStyle = "rgb(64,255,64)";
  tctx.fillRect(1, 0, 1, 1);
  tctx.fillStyle = "rgb(64,64,255)";
  tctx.fillRect(2, 0, 1, 1);
  const ctx = ctx2d(canvas);
  const pattern = ctx.createPattern(tile, "repeat");
  if (pattern) {
    ctx.save();
    ctx.globalAlpha = strength * 0.18;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  return canvas;
}

/** Darkened corners; strength 0..1 kept subtle for authenticity. */
export function vignette(canvas: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  if (strength <= 0.01) return canvas;
  const { width: w, height: h } = canvas;
  const ctx = ctx2d(canvas);
  const r = Math.hypot(w, h) / 2;
  const grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.55, w / 2, h / 2, r);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${0.35 * strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  return canvas;
}
