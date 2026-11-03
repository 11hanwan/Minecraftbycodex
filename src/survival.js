export const WORLD_RADIUS = 72;
// Smooth island terrain, with a freshwater pool near the landing place.
export function heightAt(x, z) {
  const radius = Math.hypot(x, z);
  const base =
    5.2 -
    Math.pow(radius / 57, 4) * 6 +
    Math.sin(x * 0.085) * 2.8 +
    Math.cos(z * 0.11) * 1.5 +
    Math.sin(x * 0.19 + z * 0.14) * 0.65;
  const lakeDistance = Math.hypot(x + 12, z - 8);
  const lakeBlend = Math.max(0, 1 - lakeDistance / 10);
  return Math.max(
    -5,
    base * (1 - lakeBlend) + (0.5 + lakeDistance * 0.17) * lakeBlend,
  );
}
export function seededRandom(seed = 7419) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
