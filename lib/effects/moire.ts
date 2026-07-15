import { createCanvas, ctx2d } from "./core";

export interface MoireOptions {
  /** 0..1 visibility. Keep low — real moiré is subtle. */
  strength: number;
  /** Stripe pitch in px. */
  spacing?: number;
  /** Stripe angle in radians. */
  angle?: number;
}

/**
 * Interference stripes from photographing/screenshotting a screen.
 * Call twice with slightly different angles for a true moiré beat pattern.
 */
export function addMoire(canvas: HTMLCanvasElement, opts: MoireOptions): HTMLCanvasElement {
  const { strength, spacing = 4, angle = 0.15 } = opts;
  if (strength <= 0.005) return canvas;
  const pitch = Math.max(2, Math.round(spacing));
  const tile = createCanvas(1, pitch);
  const tctx = ctx2d(tile);
  tctx.fillStyle = "rgba(0,0,0,0.5)";
  tctx.fillRect(0, 0, 1, 1);
  tctx.fillStyle = "rgba(255,255,255,0.5)";
  tctx.fillRect(0, Math.floor(pitch / 2), 1, 1);

  const ctx = ctx2d(canvas);
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return canvas;
  const diag = Math.hypot(canvas.width, canvas.height);
  ctx.save();
  ctx.globalAlpha = strength * 0.25;
  ctx.globalCompositeOperation = "overlay";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(angle);
  ctx.fillStyle = pattern;
  ctx.fillRect(-diag / 2, -diag / 2, diag, diag);
  ctx.restore();
  return canvas;
}
