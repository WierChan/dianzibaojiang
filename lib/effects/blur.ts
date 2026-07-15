import { cloneCanvas, createCanvas, ctx2d } from "./core";
import { resizeTo } from "./resize";

let filterSupport: boolean | null = null;

function supportsCanvasFilter(): boolean {
  if (filterSupport === null) {
    const ctx = createCanvas(1, 1).getContext("2d");
    filterSupport = !!ctx && typeof ctx.filter === "string";
  }
  return filterSupport;
}

/** Gaussian blur. Uses the native canvas filter, with a resample fallback. */
export function gaussianBlur(canvas: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  if (radius <= 0.05) return canvas;
  if (supportsCanvasFilter()) {
    const out = cloneCanvas(canvas); // pre-fill so filter edge bleed stays invisible
    const ctx = ctx2d(out);
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
    return out;
  }
  // Fallback: down/up resample approximates a soft gaussian.
  const { width, height } = canvas;
  const f = 1 / (1 + radius);
  const small = resizeTo(canvas, Math.max(1, width * f), Math.max(1, height * f), "high");
  return resizeTo(small, width, height, "high");
}
