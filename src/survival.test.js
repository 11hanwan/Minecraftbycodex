import { test } from "node:test";
import assert from "node:assert/strict";
import { heightAt, seededRandom } from "./survival.js";
test("landing and freshwater source have suitable elevations", () => {
  assert.ok(heightAt(3, 17) > 2.3);
  assert.ok(heightAt(-12, 8) < 2.15);
  for (const [x, z] of [
    [72, 72],
    [-72, -72],
    [72, -72],
    [-72, 72],
  ])
    assert.equal(heightAt(x, z), -5);
});
test("terrain is smooth enough for walking without block steps", () => {
  for (let x = -40; x < 40; x++)
    for (let z = -40; z < 40; z++)
      assert.ok(Math.abs(heightAt(x + 0.05, z) - heightAt(x, z)) < 0.15);
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
