import { canvasToBlob, cloneCanvas, ctx2d } from "./core";

/**
 * Round-trip the canvas through a real JPEG encode/decode.
 * This is the single most important "aging" primitive — real block
 * artifacts, real chroma subsampling, exactly like a re-upload.
 * quality: 0..1
 */
export async function compressJPEG(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<HTMLCanvasElement> {
  if (quality >= 0.999) return canvas;
  const blob = await canvasToBlob(canvas, "image/jpeg", Math.max(0.01, quality));
  const bmp = await createImageBitmap(blob);
  const ctx = ctx2d(canvas);
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return canvas;
}

/**
 * Shift the image by (dx, dy) against a white backing before the next
 * re-encode. Re-saves never re-align the JPEG 8×8 grid, so each pass lands
 * its blocking on different pixels and the artifacts compound instead of
 * overprinting — magiconch nudges ±2px between every round for exactly this.
 * The revealed edge sliver (white fill) is itself a genuine re-save tell.
 */
export function nudgeGrid(
  canvas: HTMLCanvasElement,
  dx: number,
  dy: number,
): HTMLCanvasElement {
  if (dx === 0 && dy === 0) return canvas;
  const prev = cloneCanvas(canvas);
  const ctx = ctx2d(canvas);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(prev, dx, dy);
  return canvas;
}
