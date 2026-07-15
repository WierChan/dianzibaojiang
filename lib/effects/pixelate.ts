import { resizeTo } from "./resize";

/**
 * 波普 pixel-grid: sample down by `block` px and blow back up with
 * nearest-neighbour, leaving a visible pop-art pixel lattice.
 */
export function pixelate(canvas: HTMLCanvasElement, block: number): HTMLCanvasElement {
  if (block <= 1) return canvas;
  const { width, height } = canvas;
  const small = resizeTo(
    canvas,
    Math.max(1, width / block),
    Math.max(1, height / block),
    "medium",
  );
  return resizeTo(small, width, height, "pixelated");
}
