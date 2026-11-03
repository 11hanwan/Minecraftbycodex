import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyInventory,
  craftStatus,
  makeItem,
  gatherRule,
} from "./progression.js";
test("new survivors own no resources and cannot receive free tools", () => {
  const bag = emptyInventory(),
    owned = [];
  assert.ok(Object.values(bag).every((n) => n === 0));
  assert.equal(makeItem(bag, owned, "axe").ok, false);
  assert.deepEqual(owned, []);
});
test("gathering and crafting progress from bare hands to an earned axe", () => {
  const bag = emptyInventory(),
    owned = [];
  assert.equal(gatherRule("wood").allowed, true);
  assert.equal(gatherRule("stone").allowed, false);
  Object.assign(bag, { wood: 4, stone: 3, fiber: 2 });
  assert.equal(makeItem(bag, owned, "axe").ok, true);
  assert.deepEqual(owned, ["axe"]);
  assert.equal(bag.wood, 0);
  assert.equal(makeItem(bag, owned, "axe").ok, false);
  assert.ok(gatherRule("wood", "axe").amount > gatherRule("wood").amount);
  assert.equal(gatherRule("ore", "pickaxe").allowed, true);
});
test("advanced recipes require a nearby station and charge exact resources", () => {
  const bag = { ...emptyInventory(), ore: 6, wood: 4, coal: 2 };
  assert.equal(craftStatus(bag, [], "metal").ok, false);
  assert.equal(makeItem(bag, [], "metal", ["furnace"]).ok, true);
  assert.equal(bag.ore, 3);
  assert.equal(bag.wood, 4);
  assert.equal(bag.metal, 1);
  assert.equal(bag.coal, 0);
  const before = { ...bag };
  assert.equal(makeItem(bag, [], "ironAxe", ["bench"]).ok, false);
  assert.deepEqual(bag, before);
});
test("construction does not consume materials until requirements are met", () => {
  const bag = emptyInventory();
  bag.wood = 5;
  assert.equal(makeItem(bag, [], "wall").ok, false);
  assert.equal(bag.wood, 5);
  assert.equal(makeItem(bag, [], "floor").ok, true);
  assert.equal(bag.wood, 0);
});
