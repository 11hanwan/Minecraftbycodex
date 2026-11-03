// Shared survival rules. Inventory starts empty; tools must be crafted.
export const resourceNames = {
  wood: "trä",
  stone: "sten",
  fiber: "fiber",
  berries: "bär",
  ore: "järnmalm",
  metal: "järn",
  rawMeat: "rått kött",
  meat: "stekt kött",
  coal: "träkol",
};
export const items = {
  axe: {
    name: "Stenyxa",
    icon: "🪓",
    description: "Hugg träd snabbare och få mer trä med färre slag.",
    cost: { wood: 4, stone: 3, fiber: 2 },
    tool: true,
  },
  pickaxe: {
    name: "Stenhacka",
    icon: "⛏",
    description: "Bryt sten och järnmalm i bergen.",
    cost: { wood: 4, stone: 5, fiber: 2 },
    tool: true,
  },
  spear: {
    name: "Träspjut",
    icon: "↟",
    description: "Jaga djur och försvara dig på avstånd.",
    cost: { wood: 6, stone: 2, fiber: 3 },
    tool: true,
  },
  ironAxe: {
    name: "Järnyxa",
    icon: "🪓",
    description: "Ett slitstarkt verktyg för stora skördar.",
    cost: { wood: 4, metal: 4, fiber: 2 },
    station: "bench",
    tool: true,
  },
  fire: {
    name: "Lägereld",
    icon: "♨",
    description: "Värme och matlagning. Skyddar mot vargar.",
    cost: { wood: 8, stone: 6 },
    build: true,
  },
  bench: {
    name: "Arbetsbänk",
    icon: "⚒",
    description: "Låser upp järnverktyg och avancerade byggen.",
    cost: { wood: 14, stone: 6, fiber: 4 },
    build: true,
  },
  furnace: {
    name: "Smältugn",
    icon: "♜",
    description: "Förvandla malm och träkol till järn.",
    cost: { stone: 20, wood: 8 },
    station: "bench",
    build: true,
  },
  wall: {
    name: "Trävägg",
    icon: "▥",
    description: "En stadig vägg till ditt skydd.",
    cost: { wood: 6, fiber: 2 },
    build: true,
  },
  floor: {
    name: "Grund",
    icon: "▱",
    description: "En plan grund för ditt hem.",
    cost: { wood: 5 },
    build: true,
  },
  roof: {
    name: "Tak",
    icon: "⌂",
    description: "Komplettera ditt skydd med ett halmtak.",
    cost: { wood: 5, fiber: 6 },
    build: true,
  },
  door: {
    name: "Dörr",
    icon: "▯",
    description: "Öppna och stäng med E.",
    cost: { wood: 8, fiber: 3 },
    build: true,
  },
  chest: {
    name: "Förvaringskista",
    icon: "▣",
    description: "Förvara resurser säkert i ditt läger.",
    cost: { wood: 12, stone: 2 },
    build: true,
  },
  bed: {
    name: "Sovplats",
    icon: "▰",
    description: "Sov till morgonen när lägret är tryggt.",
    cost: { wood: 6, fiber: 12 },
    build: true,
  },
  meat: {
    name: "Stek kött",
    icon: "♨",
    description: "Matlagning vid en lägereld. Återställer hunger.",
    cost: { rawMeat: 1, wood: 1 },
    station: "fire",
    output: { meat: 1 },
  },
  coal: {
    name: "Bränn träkol",
    icon: "◆",
    description: "Bränn ved vid elden för bränsle till smältugnen.",
    cost: { wood: 3 },
    station: "fire",
    output: { coal: 2 },
  },
  metal: {
    name: "Smält järn",
    icon: "◆",
    description: "Smält järnmalm med träkol i en smältugn.",
    cost: { ore: 3, coal: 2 },
    station: "furnace",
    output: { metal: 1 },
  },
};
export function emptyInventory() {
  return Object.fromEntries(Object.keys(resourceNames).map((k) => [k, 0]));
}
export function craftStatus(inventory, owned, id, stations = []) {
  const recipe = items[id];
  if (!recipe) return { ok: false, reason: "Okänt recept" };
  if (recipe.tool && owned.includes(id))
    return { ok: false, reason: "Redan tillverkad" };
  if (recipe.station && !stations.includes(recipe.station))
    return {
      ok: false,
      reason: `Kräver ${items[recipe.station].name.toLowerCase()} i närheten`,
    };
  if (
    !Object.entries(recipe.cost).every(
      ([key, count]) => (inventory[key] || 0) >= count,
    )
  )
    return { ok: false, reason: "Du saknar resurser" };
  return { ok: true, reason: "" };
}
export function makeItem(inventory, owned, id, stations = []) {
  const status = craftStatus(inventory, owned, id, stations);
  if (!status.ok) return status;
  const recipe = items[id];
  for (const [key, count] of Object.entries(recipe.cost))
    inventory[key] -= count;
  if (recipe.tool) owned.push(id);
  for (const [key, count] of Object.entries(recipe.output || {}))
    inventory[key] += count;
  return { ok: true, build: !!recipe.build };
}
export function gatherRule(kind, tool = "hands") {
  if (kind === "wood")
    return {
      allowed: true,
      damage: tool === "ironAxe" ? 4 : tool === "axe" ? 2 : 1,
      amount: tool === "ironAxe" ? 12 : tool === "axe" ? 8 : 3,
    };
  if (kind === "stone")
    return {
      allowed: tool === "pickaxe",
      damage: 2,
      amount: 6,
      reason: "Tillverka en stenhacka. Småsten på marken kan plockas för hand.",
    };
  if (kind === "ore")
    return {
      allowed: tool === "pickaxe",
      damage: 1,
      amount: 4,
      reason: "Du behöver en stenhacka för järnmalm.",
    };
  return { allowed: true, damage: 1, amount: kind === "fiber" ? 4 : 3 };
}
