import { createCanvas, ctx2d } from "./core";

export type ResampleQuality = "pixelated" | "low" | "medium" | "high";

export function resizeTo(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  quality: ResampleQuality = "medium",
): HTMLCanvasElement {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (w === canvas.width && h === canvas.height) return canvas;
  const out = createCanvas(w, h);
  const ctx = ctx2d(out);
  if (quality === "pixelated") {
    ctx.imageSmoothingEnabled = false;
  } else {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = quality;
  }
  ctx.drawImage(canvas, 0, 0, w, h);
  return out;
}

export function resizeDown(
  canvas: HTMLCanvasElement,
  scale: number,
  quality: ResampleQuality = "medium",
): HTMLCanvasElement {
  return resizeTo(canvas, canvas.width * scale, canvas.height * scale, quality);
}

export function resizeUp(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  quality: ResampleQuality = "low",
): HTMLCanvasElement {
  return resizeTo(canvas, width, height, quality);
}

/**
 * Hard-cap the longest edge to `maxEdge` and *keep it there* — the image
 * actually loses pixels, the way a platform's upload size limit does. Never
 * enlarges (dimensions only ratchet down, like real transfer chains). Unlike
 * resizeRoundTrip, the smaller dimensions are the output.
 *
 * Absolute (not ratio) so preview and full-res renders converge to the same
 * final size, as long as maxEdge ≤ the preview cap.
 */
export function capLongEdge(
  canvas: HTMLCanvasElement,
  maxEdge: number,
  quality: ResampleQuality = "medium",
): HTMLCanvasElement {
  const long = Math.max(canvas.width, canvas.height);
  if (maxEdge >= long) return canvas; // only ever shrinks
  const scale = maxEdge / long;
  return resizeTo(canvas, canvas.width * scale, canvas.height * scale, quality);
}

/**
 * Downscale then upscale back to the original size — the classic
 * "saved from a thumbnail" resolution loss while keeping dimensions.
 */
export function resizeRoundTrip(
  canvas: HTMLCanvasElement,
  scale: number,
  upQuality: ResampleQuality = "low",
): HTMLCanvasElement {
  if (scale >= 0.995) return canvas;
  const { width, height } = canvas;
  return resizeUp(resizeDown(canvas, scale, "medium"), width, height, upQuality);
}
