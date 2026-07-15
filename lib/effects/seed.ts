/** Deterministic seeding utilities (xmur3-style string hash). */

/** Hash an arbitrary string into an unsigned 32-bit integer. */
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A short human-friendly random seed, used when the user leaves the seed empty. */
export function randomSeedString(): string {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += abc[Math.floor(Math.random() * abc.length)];
  }
  return s;
}
