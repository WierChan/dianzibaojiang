/** Shared canvas plumbing used by every effect. Client-side only. */

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

export function ctx2d(
  canvas: HTMLCanvasElement,
  willReadFrequently = false,
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently });
  if (!ctx) throw new Error("2D canvas context unavailable");
  return ctx;
}

export function cloneCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const c = createCanvas(canvas.width, canvas.height);
  ctx2d(c).drawImage(canvas, 0, 0);
  return c;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`encode failed: ${type}`))),
      type,
      quality,
    );
  });
}

/** Fit (w, h) within maxDim, preserving aspect ratio. Returns [w, h]. */
export function fitWithin(w: number, h: number, maxDim: number): [number, number] {
  const scale = Math.min(1, maxDim / Math.max(w, h));
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
}

/** Copy of `canvas` downscaled so its longest side is at most maxDim. */
export function capCanvas(canvas: HTMLCanvasElement, maxDim: number): HTMLCanvasElement {
  if (Math.max(canvas.width, canvas.height) <= maxDim) return cloneCanvas(canvas);
  const [w, h] = fitWithin(canvas.width, canvas.height, maxDim);
  const out = createCanvas(w, h);
  const ctx = ctx2d(out);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, w, h);
  return out;
}
