// Shared survival rules. Inventory starts empty; tools must be crafted.
import { resourceNames, emptyInventory, count, transact } from "./inventory.js";
export { resourceNames, emptyInventory };
export const items = {
  axe: {
    name: "Stenyxa",
    icon: "🪓",
    description: "Hugg träd snabbare och få mer trä med färre slag.",
    cost: { wood: 4, stone: 3, leaves: 2 },
    tool: true,
  },
  pickaxe: {
    name: "Stenhacka",
    icon: "⛏",
    description: "Bryt sten och järnmalm i bergen.",
    cost: { wood: 4, stone: 5, leaves: 2 },
    tool: true,
  },
  spear: {
    name: "Träspjut",
    icon: "↟",
    description: "Jaga djur och försvara dig på avstånd.",
    cost: { wood: 6, stone: 2, leaves: 3 },
    tool: true,
  },
  ironAxe: {
    name: "Järnyxa",
    icon: "🪓",
    description: "Ett slitstarkt verktyg för stora skördar.",
    cost: { wood: 4, metal: 4, leaves: 2 },
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
    cost: { wood: 14, stone: 6, leaves: 4 },
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
    cost: { wood: 6, leaves: 2 },
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
    cost: { wood: 5, leaves: 6 },
    build: true,
  },
  door: {
    name: "Dörr",
    icon: "▯",
    description: "Öppna och stäng med F.",
    cost: { wood: 8, leaves: 3 },
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
    cost: { wood: 6, leaves: 12 },
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

export function craftStatus(inventory, owned, id, stations = []) {
  const recipe = items[id];
  if (!recipe) return { ok: false, reason: "Okänt recept" };
  if (recipe.station && !stations.includes(recipe.station))
    return {
      ok: false,
      reason: `Kräver ${items[recipe.station].name.toLowerCase()} i närheten`,
    };
  return transact(inventory, recipe.cost, recipe.output || { [id]: 1 });
}
export function makeItem(inventory, owned, id, stations = []) {
  const status = craftStatus(inventory, owned, id, stations);
  if (!status.ok) return status;
  inventory.splice(0, inventory.length, ...status.slots);
  return { ok: true, build: !!items[id].build };
}
export const variants = {
  pine: { name: "Tall", hp: 18, amount: 10, drop: "pineWood" },
  birch: { name: "Björk", hp: 26, amount: 16, drop: "birchWood" },
  oak: { name: "Ek", hp: 38, amount: 24, drop: "oakWood" },
  limestone: { name: "Kalksten", hp: 22, amount: 12, drop: "limestone" },
  granite: { name: "Granit", hp: 36, amount: 18, drop: "granite" },
  basalt: { name: "Basalt", hp: 50, amount: 26, drop: "basalt" },
  ore: { name: "Järnåder", hp: 40, amount: 8, drop: "ore" },
};
export function gatherRule(kind, tool = "hands", variant) {
  const definition =
    variants[variant] ||
    variants[kind === "wood" ? "pine" : kind === "stone" ? "limestone" : "ore"];
  if (kind === "wood")
    return {
      allowed: tool === "axe" || tool === "ironAxe",
      damage: tool === "ironAxe" ? 5 : 2,
      amount: definition.amount,
      drop: definition.drop,
      reason:
        "Du behöver en yxa. Plocka grenar, småsten och löv från marken för att tillverka en.",
    };
  if (kind === "stone" || kind === "ore")
    return {
      allowed: tool === "pickaxe",
      damage: 2,
      amount: definition.amount,
      drop: definition.drop,
      reason: "Du behöver en hacka. Småsten på marken kan plockas för hand.",
    };
  return {
    allowed: true,
    damage: 1,
    amount: kind === "leaves" ? 4 : 3,
    drop: kind,
  };
}
