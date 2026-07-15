import { ctx2d } from "./core";

export interface WatermarkOptions {
  text: string;
  /** Font size as a fraction of min(w, h). */
  scale?: number;
  shadowAlpha?: number;
}

/**
 * The magiconch-style bottom-right "@username" watermark: bold white
 * text with a soft dark shadow. Stamped BEFORE the aging pipeline so
 * the watermark itself picks up patina — that's what sells it.
 */
export function addWatermark(canvas: HTMLCanvasElement, opts: WatermarkOptions): HTMLCanvasElement {
  const text = opts.text.trim();
  if (!text) return canvas;
  const { scale = 0.042, shadowAlpha = 0.55 } = opts;
  const size = Math.max(12, Math.round(Math.min(canvas.width, canvas.height) * scale));
  const pad = Math.round(size * 0.7);
  const ctx = ctx2d(canvas);
  ctx.save();
  ctx.font = `bold ${size}px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = `rgba(0,0,0,${shadowAlpha})`;
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetX = size * 0.06;
  ctx.shadowOffsetY = size * 0.06;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const y = canvas.height - pad - (lines.length - 1 - i) * size * 1.25;
    ctx.fillText(line, canvas.width - pad, y);
  });
  ctx.restore();
  return canvas;
}
