/** A small, deterministic 32-bit seeded generator. */

export function createRng(seed) {
  let state = toUint32(seed);
  return function next() {
    state = toUint32(state + 0x6d2b79f5);
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function windFromSeed(seed, options = {}) {
  const maxSpeed = options.maxSpeed ?? 12;
  const rng = createRng(seed);
  const speed = rng() * maxSpeed;
  const angle = rng() * Math.PI * 2;
  return { speed, angle };
}

export function defaultWindSeed(courseId, holeNumber) {
  const text = `${courseId ?? 'course'}:${holeNumber}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return toUint32(hash);
}

function toUint32(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return n >>> 0 || 1;
}
