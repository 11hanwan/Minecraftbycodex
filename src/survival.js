export const WORLD_RADIUS = 48;
export function heightAt(x, z) {
  x = Math.round(x / 2) * 2;
  z = Math.round(z / 2) * 2;
  const d = Math.hypot(x, z);
  const island = 3.8 - Math.pow(d / 37, 3) * 4;
  return Math.max(
    -3,
    Math.floor(
      island +
        Math.sin(x * 0.17) * 1.5 +
        Math.cos(z * 0.19) * 1.2 +
        Math.sin(x * 0.09 + z * 0.13),
    ),
  );
}
export const recipes = {
  wall: { wood: 4, stone: 0 },
  floor: { wood: 3, stone: 0 },
  fire: { wood: 5, stone: 4 },
};
export function canCraft(inventory, type) {
  const cost = recipes[type];
  return !!cost && inventory.wood >= cost.wood && inventory.stone >= cost.stone;
}
export function craft(inventory, type) {
  if (!canCraft(inventory, type)) return false;
  inventory.wood -= recipes[type].wood;
  inventory.stone -= recipes[type].stone;
  return true;
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
