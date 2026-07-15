import { createCanvas, ctx2d, fitWithin } from "./effects/core";

const MAX_DIM = 6000;

/**
 * Decode an image file into an opaque canvas (alpha flattened onto white,
 * since the aging pipeline round-trips through JPEG). Caps at 6000px.
 */
export async function loadImageFile(file: File): Promise<HTMLCanvasElement> {
  const bmp = await decode(file);
  const [w, h] = fitWithin(bmp.width, bmp.height, MAX_DIM);
  const canvas = createCanvas(w, h);
  const ctx = ctx2d(canvas);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  if ("close" in bmp) bmp.close();
  return canvas;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Fallback for formats createImageBitmap rejects in some browsers.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
