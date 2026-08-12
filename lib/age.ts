import type { PresetId } from "./effects/pipelines";
import { clamp, type RNG } from "./effects/random";

/** Playful post-generation statistics — procedural, not measured. */
export interface AgeStats {
  years: number;
  uploads: number;
  screenshots: number;
  compressions: number;
}

const BASE: Record<PresetId, AgeStats> = {
  classic: { years: 8, uploads: 120, screenshots: 25, compressions: 220 },
  qq2008: { years: 16, uploads: 260, screenshots: 60, compressions: 430 },
  tieba: { years: 13, uploads: 310, screenshots: 45, compressions: 480 },
  wechat: { years: 9, uploads: 180, screenshots: 95, compressions: 310 },
  screenshotception: { years: 7, uploads: 90, screenshots: 210, compressions: 260 },
  screenphoto: { years: 10, uploads: 150, screenshots: 70, compressions: 300 },
  survivor: { years: 17, uploads: 340, screenshots: 130, compressions: 560 },
};

export function estimateAge(preset: PresetId, intensity: number, rng: RNG): AgeStats {
  const t = clamp(intensity / 100, 0, 1);
  const k = 0.08 + 0.95 * t;
  const base = BASE[preset];
  const jitter = () => rng.range(0.85, 1.18);
  return {
    years: Math.max(0.1, Math.round(base.years * k * jitter() * 10) / 10),
    uploads: Math.max(1, Math.round(base.uploads * k * jitter())),
    screenshots: Math.max(0, Math.round(base.screenshots * k * jitter())),
    compressions: Math.max(1, Math.round(base.compressions * k * jitter())),
  };
}
