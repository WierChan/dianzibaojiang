/**
 * 屏摄 — photographing a screen, modeled as the physical chain it is.
 *
 * A phone camera aimed at an LCD stacks: geometric misalignment (keystone),
 * optical defocus, lateral chromatic aberration that grows toward the edges,
 * backlight glare, sensor shot noise, and finally the camera's own JPEG. The
 * signature artifact — moiré — is NOT a stripe overlay; it's the *beat* between
 * the display's pixel grid and the sensor's sampling grid. `realMoire` derives
 * that beat from two gratings, so it rides the content and is colored by the
 * RGB subpixel phase, the way real screen photos are.
 */

import { gaussianBlur } from "./blur";
import { compressJPEG } from "./compress";
import { cloneCanvas, ctx2d } from "./core";
import { clamp, type RNG } from "./random";

const clip8 = (x: number): number => (x < 0 ? 0 : x > 255 ? 255 : x);

/**
 * Moiré as a true two-grating beat. The screen emits at pitch `pitch`; the
 * sensor samples at a slightly different rate (`ratio`). Their interference
 * leaves a low-frequency envelope of wavelength ≈ pitch/|ratio−1|. The R/G/B
 * subpixels sit at different phases, so the beat is colored — the tell-tale
 * rainbow banding of a photographed screen, not a gray stripe.
 */
export function realMoire(
  canvas: HTMLCanvasElement,
  opts: { pitch?: number; ratio?: number; angle?: number; strength?: number } = {},
): HTMLCanvasElement {
  const { pitch = 3, ratio = 1.08, angle = 0.12, strength = 0.15 } = opts;
  if (strength <= 0.005) return canvas;
  const { width: w, height: h } = canvas;
  const ctx = ctx2d(canvas, true);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const beatFreq = (2 * Math.PI * (ratio - 1)) / pitch; // demodulated beat
  const phaseStep = (2 * Math.PI) / 3; // R/G/B subpixel phase offsets
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x * ca + y * sa;
      const base = beatFreq * u;
      const i = (y * w + x) * 4;
      d[i] = clip8(d[i] * (1 + strength * Math.cos(base)));
      d[i + 1] = clip8(d[i + 1] * (1 + strength * Math.cos(base + phaseStep)));
      d[i + 2] = clip8(d[i + 2] * (1 + strength * Math.cos(base + 2 * phaseStep)));
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Lateral chromatic aberration that scales with field radius — red magnified,
 * blue minified about the frame center, so fringing is nil at the middle and
 * strongest at the corners. Radial, unlike a flat horizontal channel shift.
 */
export function radialAberration(canvas: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  if (strength <= 0.05) return canvas;
  const { width: w, height: h } = canvas;
  const ctx = ctx2d(canvas, true);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  const cx = w / 2;
  const cy = h / 2;
  const e = strength / Math.max(w, h); // per-radius scale factor
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const rxR = clamp(Math.round(cx + dx * (1 + e)), 0, w - 1);
      const ryR = clamp(Math.round(cy + dy * (1 + e)), 0, h - 1);
      const rxB = clamp(Math.round(cx + dx * (1 - e)), 0, w - 1);
      const ryB = clamp(Math.round(cy + dy * (1 - e)), 0, h - 1);
      const i = (y * w + x) * 4;
      d[i] = src[(ryR * w + rxR) * 4];
      d[i + 2] = src[(ryB * w + rxB) * 4 + 2];
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Sensor noise with the right shape: a constant read-noise floor (grain that
 * shows up in shadows) plus a shot-noise term that grows with √luminance. This
 * is why phone-shot screens are grainy in the darks and cleaner in highlights.
 */
export function sensorNoise(canvas: HTMLCanvasElement, amp: number, seed: number): HTMLCanvasElement {
  if (amp <= 0.02) return canvas;
  const ctx = ctx2d(canvas, true);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let a = (seed >>> 0) || 1;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const sigma = amp * (0.45 + 0.9 * Math.sqrt(y / 255)); // read floor + shot
    d[i] = clip8(d[i] + (rnd() * 2 - 1) * sigma);
    d[i + 1] = clip8(d[i + 1] + (rnd() * 2 - 1) * sigma);
    d[i + 2] = clip8(d[i + 2] + (rnd() * 2 - 1) * sigma);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Keystone: shooting a screen off-axis makes a rectangle into a trapezoid.
 * Sliced-band horizontal scaling (top and bottom widths differ), on a white
 * backing so the revealed wedge reads like desk/wall behind the phone.
 */
export function keystone(canvas: HTMLCanvasElement, amount: number, rng: RNG): HTMLCanvasElement {
  if (amount <= 0.005) return canvas;
  const { width: w, height: h } = canvas;
  const src = cloneCanvas(canvas);
  const ctx = ctx2d(canvas);
  ctx.fillStyle = "#f2f0ec";
  ctx.fillRect(0, 0, w, h);
  const flip = rng.chance(0.5);
  const topScale = flip ? 1 : 1 - amount;
  const botScale = flip ? 1 - amount : 1;
  const bands = Math.min(h, 120);
  const bandH = h / bands;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  for (let b = 0; b < bands; b++) {
    const yFrac = b / (bands - 1);
    const scale = topScale + (botScale - topScale) * yFrac;
    const dw = w * scale;
    const dx = (w - dw) / 2;
    const sy = yFrac * (h - bandH);
    ctx.drawImage(src, 0, sy, w, bandH, dx, b * bandH, dw, bandH + 1);
  }
  return canvas;
}

/** Uneven backlight + a soft specular hot-spot, the glare of a lit panel. */
function glare(canvas: HTMLCanvasElement, strength: number, rng: RNG): HTMLCanvasElement {
  if (strength <= 0.01) return canvas;
  const { width: w, height: h } = canvas;
  const ctx = ctx2d(canvas);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const gx = w * rng.range(0.25, 0.75);
  const gy = h * rng.range(0.15, 0.55);
  const r = Math.hypot(w, h) * rng.range(0.35, 0.6);
  const spec = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
  spec.addColorStop(0, `rgba(255,255,255,${0.28 * strength})`);
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spec;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  return canvas;
}

export interface ScreenPhotoOptions {
  rng: RNG;
  /** 0..1 overall intensity. */
  t: number;
  /** Pixel-unit scale so radii match at preview and full res. */
  s: number;
}

/**
 * The full re-shoot: keystone → defocus → moiré → glare → radial CA →
 * sensor noise → the phone's own JPEG. Each stage is the real optical/sensor
 * step, composed in physical order.
 */
export async function simulateScreenPhoto(
  canvas: HTMLCanvasElement,
  { rng, t, s }: ScreenPhotoOptions,
): Promise<HTMLCanvasElement> {
  let c = canvas;
  if (rng.chance(0.75)) c = keystone(c, rng.range(0.01, 0.07) * (0.4 + t), rng);
  c = gaussianBlur(c, (0.3 + 1.1 * t) * s);
  c = realMoire(c, {
    pitch: Math.max(2, Math.round(rng.range(2.3, 4.2) * s)),
    ratio: rng.range(1.04, 1.15),
    // Any orientation — you never hold the phone squared up to the screen.
    angle: rng.range(-1.4, 1.4),
    strength: 0.06 + 0.24 * t,
  });
  c = glare(c, 0.3 + 0.8 * t, rng);
  c = radialAberration(c, rng.range(0.8, 3.0) * s * (0.4 + t));
  c = sensorNoise(c, (1.2 + 5 * t) * (0.4 + 0.6 * s), rng.int(1, 0x7fffffff));
  c = await compressJPEG(c, clamp(rng.range(0.72, 0.9) - 0.42 * t, 0.26, 0.9));
  return c;
}
