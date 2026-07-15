import { hashString } from "./seed";

/** Seeded pseudo-random number generator shared by every effect. */
export interface RNG {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
  /** Derive an independent, reproducible sub-generator. */
  fork(label: string): RNG;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): RNG {
  const next = mulberry32(hashString(seed));
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    fork: (label) => createRng(`${seed}/${label}`),
  };
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

/**
 * Intensity-interpolated randomized parameter.
 * The value is drawn uniformly from a window that slides from `atZero`
 * (intensity 0) to `atFull` (intensity 1) — every effect gets both
 * smooth intensity scaling and per-generation jitter from this.
 */
export function param(
  rng: RNG,
  t: number,
  atZero: readonly [number, number],
  atFull: readonly [number, number],
): number {
  return rng.range(lerp(atZero[0], atFull[0], t), lerp(atZero[1], atFull[1], t));
}
