import { test } from "node:test";
import assert from "node:assert/strict";
import { heightAt, craft, canCraft, seededRandom } from "./survival.js";
test("crafting charges exact resources and refuses insufficient inventory", () => {
  const inventory = { wood: 8, stone: 4 };
  assert.equal(canCraft(inventory, "fire"), true);
  assert.equal(craft(inventory, "fire"), true);
  assert.deepEqual(inventory, { wood: 3, stone: 0 });
  assert.equal(craft(inventory, "wall"), false);
  assert.deepEqual(inventory, { wood: 3, stone: 0 });
  assert.equal(craft(inventory, "unknown"), false);
});
test("island provides dry spawn and submerged boundaries", () => {
  assert.ok(heightAt(3, 9) >= 1);
  for (const [x, z] of [
    [48, 48],
    [-48, -48],
    [48, -48],
    [-48, 48],
  ])
    assert.equal(heightAt(x, z), -3);
});
test("resource generation is repeatable", () => {
  const a = seededRandom(),
    b = seededRandom();
  for (let i = 0; i < 100; i++) {
    const value = a();
    assert.equal(value, b());
    assert.ok(value >= 0 && value < 1);
  }
});
