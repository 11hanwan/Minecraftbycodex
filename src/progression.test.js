import { test } from "node:test";
import assert from "node:assert/strict";
import { craftStatus, makeItem, gatherRule, variants } from "./progression.js";
import {
  emptyInventory,
  collect,
  count,
  exactCount,
  moveSlot,
  normalizeInventory,
  transact,
  removeItems,
} from "./inventory.js";
const bagWith = (output) => {
  const bag = emptyInventory();
  assert.equal(collect(bag, output).ok, true);
  return bag;
};
test("27 slots start truly empty, including the 9 hotbar slots", () => {
  const bag = emptyInventory();
  assert.equal(bag.length, 27);
  assert.ok(bag.every((s) => s === null));
  assert.equal(makeItem(bag, [], "axe").ok, false);
});
test("hands and wrong tools never damage or harvest standing trees", () => {
  for (const variant of ["pine", "birch", "oak"])
    for (const tool of ["hands", "spear", "pickaxe"])
      assert.equal(gatherRule("wood", tool, variant).allowed, false);
  assert.equal(gatherRule("wood", "axe", "oak").allowed, true);
  assert.equal(gatherRule("stone", "hands").allowed, false);
});
test("starter ground materials make a real tool that occupies a slot", () => {
  const bag = bagWith({ wood: 4, stone: 3, leaves: 2 });
  assert.equal(makeItem(bag, [], "axe").ok, true);
  assert.equal(exactCount(bag, "axe"), 1);
  assert.equal(bag.filter(Boolean).length, 1);
  assert.equal(count(bag, "wood"), 0);
});
test("stacks split at 64 and tools never stack", () => {
  const bag = bagWith({ wood: 130, axe: 2 });
  assert.deepEqual(
    bag.slice(0, 3).map((s) => s.count),
    [64, 64, 2],
  );
  assert.deepEqual(bag.slice(3, 5), [
    { id: "axe", count: 1 },
    { id: "axe", count: 1 },
  ]);
});
test("full inventory rejects pickups atomically but accepts room in an existing stack", () => {
  const bag = bagWith({ wood: 64 * 26, stone: 63 });
  const before = structuredClone(bag);
  assert.equal(collect(bag, { leaves: 1, stone: 1 }).ok, false);
  assert.deepEqual(bag, before);
  assert.equal(collect(bag, { stone: 1 }).ok, true);
  assert.equal(count(bag, "stone"), 64);
  assert.equal(collect(bag, { stone: 1 }).ok, false);
});
test("crafting checks capacity after consuming inputs, with no lost materials on failure", () => {
  const bag = bagWith({ wood: 64 * 24, stone: 64, leaves: 64, berries: 64 });
  const before = structuredClone(bag);
  assert.equal(craftStatus(bag, [], "axe").ok, false);
  assert.deepEqual(bag, before);
  bag[26] = null;
  assert.equal(makeItem(bag, [], "axe").ok, true);
  const compact = bagWith({ wood: 4, stone: 3, leaves: 2, berries: 64 * 24 });
  assert.equal(makeItem(compact, [], "axe").ok, true);
});
test("mixed wood and stone varieties count as recipe families but remain separate stacks", () => {
  const bag = bagWith({
    pineWood: 2,
    oakWood: 2,
    limestone: 1,
    granite: 2,
    leaves: 2,
  });
  assert.equal(count(bag, "wood"), 4);
  assert.equal(makeItem(bag, [], "axe").ok, true);
  assert.equal(count(bag, "stone"), 0);
  assert.equal(exactCount(bag, "axe"), 1);
});
test("slot moves merge, swap and preserve partial stacks", () => {
  const bag = emptyInventory();
  bag[0] = { id: "leaves", count: 50 };
  bag[1] = { id: "leaves", count: 30 };
  moveSlot(bag, 0, 1);
  assert.equal(bag[1].count, 64);
  assert.equal(bag[0].count, 16);
  moveSlot(bag, 1, 18);
  assert.equal(bag[1], null);
  assert.equal(bag[18].count, 64);
  bag[19] = { id: "axe", count: 1 };
  moveSlot(bag, 18, 19);
  assert.equal(bag[18].id, "axe");
  assert.equal(bag[19].count, 64);
});
test("exact removal of branches cannot accidentally consume a different wood variety", () => {
  const bag = bagWith({ pineWood: 3, wood: 2 });
  assert.equal(removeItems(bag, "wood", 1, true), true);
  assert.equal(exactCount(bag, "pineWood"), 3);
  assert.equal(exactCount(bag, "wood"), 1);
});
test("old save migration converts fiber to leaves and preserves quantities and tools", () => {
  const { slots, overflow } = normalizeInventory(
    { wood: 130, fiber: 10, stone: 3 },
    ["axe", "pickaxe"],
  );
  assert.equal(count(slots, "wood"), 130);
  assert.equal(count(slots, "leaves"), 10);
  assert.equal(exactCount(slots, "axe"), 1);
  assert.deepEqual(overflow, {});
  const huge = normalizeInventory({ wood: 3000 }, ["axe"]);
  assert.equal(count(huge.slots, "wood") + (huge.overflow.wood || 0), 3000);
  assert.equal(exactCount(huge.slots, "axe") + (huge.overflow.axe || 0), 1);
});
test("serialized slot arrangement survives normalization and crafted buildings consume space", () => {
  const bag = bagWith({ wood: 8, stone: 6 });
  assert.equal(makeItem(bag, [], "fire").ok, true);
  assert.equal(count(bag, "fire"), 1);
  moveSlot(
    bag,
    bag.findIndex((s) => s?.id === "fire"),
    25,
  );
  assert.deepEqual(
    normalizeInventory(JSON.parse(JSON.stringify(bag))).slots,
    bag,
  );
});
test("stations gate smelting; failed transactions leave ingredients untouched", () => {
  const bag = bagWith({ ore: 6, coal: 2 });
  assert.equal(makeItem(bag, [], "metal").ok, false);
  assert.equal(makeItem(bag, [], "metal", ["furnace"]).ok, true);
  assert.equal(count(bag, "ore"), 3);
  assert.equal(count(bag, "metal"), 1);
  assert.equal(count(bag, "coal"), 0);
  const before = structuredClone(bag);
  assert.equal(makeItem(bag, [], "ironAxe", ["bench"]).ok, false);
  assert.deepEqual(bag, before);
});
test("tree and rock varieties have higher, distinct durability and drops", () => {
  assert.ok(variants.pine.hp > 6);
  assert.ok(variants.limestone.hp > 5);
  assert.ok(
    variants.oak.hp > variants.birch.hp && variants.birch.hp > variants.pine.hp,
  );
  assert.ok(
    variants.basalt.hp > variants.granite.hp &&
      variants.granite.hp > variants.limestone.hp,
  );
  for (const variant of ["pine", "birch", "oak"]) {
    assert.equal(
      gatherRule("wood", "axe", variant).amount,
      variants[variant].amount,
    );
    assert.equal(
      gatherRule("wood", "axe", variant).drop,
      variants[variant].drop,
    );
  }
  assert.ok(
    gatherRule("wood", "ironAxe", "oak").damage >
      gatherRule("wood", "axe", "oak").damage,
  );
});
test('picked-up flint works on trees and rocks slowly with low yield, but not ore',()=>{for(const [kind,variant,better]of[['wood','oak','axe'],['stone','granite','pickaxe']]){const flint=gatherRule(kind,'stone',variant),tool=gatherRule(kind,better,variant);assert.equal(flint.allowed,true);assert.equal(flint.damage,1);assert.ok(flint.amount>0&&flint.amount<tool.amount);assert.ok(flint.damage<tool.damage);}assert.equal(gatherRule('ore','stone','ore').allowed,false);assert.equal(gatherRule('wood','hands','oak').allowed,false);});
