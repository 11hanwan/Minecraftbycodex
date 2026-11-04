export const INVENTORY_SIZE = 27,
  HOTBAR_START = 18,
  STACK_LIMIT = 64;
export const resourceNames = {
  wood: "Grenar",
  pineWood: "Tallträ",
  birchWood: "Björkträ",
  oakWood: "Ekträ",
  stone: "Flinta",
  limestone: "Kalksten",
  granite: "Granit",
  basalt: "Basalt",
  leaves: "Löv",
  berries: "Bär",
  ore: "Järnmalm",
  metal: "Järn",
  rawMeat: "Rått kött",
  meat: "Stekt kött",
  coal: "Träkol",
};
export const icons = {
  wood: "🪵",
  pineWood: "🪵",
  birchWood: "🪵",
  oakWood: "🪵",
  stone: "●",
  limestone: "◆",
  granite: "◆",
  basalt: "◆",
  leaves: "🍃",
  berries: "🫐",
  ore: "◈",
  metal: "▰",
  rawMeat: "🥩",
  meat: "🍖",
  coal: "⬟",
  axe: "🪓",
  pickaxe: "⛏",
  spear: "↟",
  ironAxe: "⚒",
  fire: "♨",
  bench: "⚒",
  furnace: "♜",
  wall: "▥",
  floor: "▱",
  roof: "⌂",
  door: "▯",
  chest: "▣",
  bed: "▰",
};
export const TOOL_IDS = ["axe", "pickaxe", "spear", "ironAxe"];
export const BUILD_IDS = [
  "fire",
  "bench",
  "furnace",
  "wall",
  "floor",
  "roof",
  "door",
  "chest",
  "bed",
];
export const isItem = (id) =>
  Object.hasOwn(resourceNames, id) ||
  TOOL_IDS.includes(id) ||
  BUILD_IDS.includes(id);
export const family = (id) =>
  ["wood", "pineWood", "birchWood", "oakWood"].includes(id)
    ? "wood"
    : ["stone", "limestone", "granite", "basalt"].includes(id)
      ? "stone"
      : id;
export const limit = (id) => (TOOL_IDS.includes(id) ? 1 : STACK_LIMIT);
export const emptyInventory = () => Array(INVENTORY_SIZE).fill(null);
export function count(slots, id) {
  return slots.reduce(
    (n, s) => n + (s && (s.id === id || family(s.id) === id) ? s.count : 0),
    0,
  );
}
export function addItems(slots, id, amount) {
  if (!isItem(id) || !Number.isInteger(amount) || amount < 0) return amount;
  if (amount === 0) return 0;
  let remaining = amount;
  for (const s of slots) {
    if (s?.id === id) {
      const n = Math.min(remaining, limit(id) - s.count);
      s.count += n;
      remaining -= n;
      if (!remaining) return 0;
    }
  }
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i]) {
      const n = Math.min(remaining, limit(id));
      slots[i] = { id, count: n };
      remaining -= n;
      if (!remaining) return 0;
    }
  }
  return remaining;
}
export const exactCount = (slots, id) =>
  slots.reduce((n, s) => n + (s?.id === id ? s.count : 0), 0);
export function removeItems(slots, id, amount, exact = false) {
  if ((exact ? exactCount(slots, id) : count(slots, id)) < amount) return false;
  let remaining = amount;
  for (let i = 0; i < slots.length && remaining; i++) {
    const s = slots[i];
    if (s && (s.id === id || (!exact && family(s.id) === id))) {
      const n = Math.min(s.count, remaining);
      s.count -= n;
      remaining -= n;
      if (!s.count) slots[i] = null;
    }
  }
  return true;
}
export function transact(slots, cost = {}, output = {}) {
  const next = slots.map((s) => (s ? { ...s } : null));
  for (const [id, n] of Object.entries(cost))
    if (!removeItems(next, id, n))
      return { ok: false, reason: "Du saknar resurser" };
  for (const [id, n] of Object.entries(output))
    if (addItems(next, id, n))
      return { ok: false, reason: "Inventariet är fullt" };
  return { ok: true, slots: next };
}
export function collect(slots, output) {
  const result = transact(slots, {}, output);
  if (result.ok) slots.splice(0, slots.length, ...result.slots);
  return result;
}
export function moveSlot(slots, from, to) {
  if (from === to || !slots[from] || !slots.hasOwnProperty(to)) return;
  const a = slots[from],
    b = slots[to];
  if (b && a.id === b.id) {
    const n = Math.min(a.count, limit(a.id) - b.count);
    b.count += n;
    a.count -= n;
    if (!a.count) slots[from] = null;
  } else [slots[from], slots[to]] = [slots[to], slots[from]];
}
export function normalizeInventory(raw, tools = []) {
  const slots = emptyInventory(),
    overflow = {};
  if (Array.isArray(raw)) {
    raw.forEach((s, i) => {
      if (s && isItem(s.id) && Number.isFinite(s.count) && s.count > 0) {
        const n = Math.floor(s.count),
          placed = i < 27 ? Math.min(n, limit(s.id)) : 0;
        if (placed) slots[i] = { id: s.id, count: placed };
        if (n > placed) overflow[s.id] = (overflow[s.id] || 0) + n - placed;
      }
    });
  } else if (raw && typeof raw === "object") {
    for (const [key, n] of Object.entries(raw)) {
      const id = key === "fiber" ? "leaves" : key;
      if (isItem(id) && Number.isFinite(n) && n > 0)
        overflow[id] = (overflow[id] || 0) + Math.floor(n);
    }
    for (const id of tools)
      if (TOOL_IDS.includes(id)) overflow[id] = (overflow[id] || 0) + 1;
  }
  for (const [id, n] of Object.entries(overflow)) {
    const rest = addItems(slots, id, n);
    if (rest) overflow[id] = rest;
    else delete overflow[id];
  }
  return { slots, overflow };
}
