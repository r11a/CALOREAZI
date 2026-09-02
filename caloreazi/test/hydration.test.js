import assert from "node:assert/strict";
import test from "node:test";
import { beverageNutrition, hydrationBeverage, hydrationContribution, hydrationTotal, normalizeCustomBeverage } from "../server/hydration.js";

test("water and selected drinks contribute their configured hydration amount", () => {
  assert.equal(hydrationContribution(250, "water"), 250);
  assert.equal(hydrationContribution(200, "coffee"), 190);
  assert.equal(hydrationTotal([{ amount: 250 }, { amount: 200, hydrationMl: 180 }]), 430);
});

test("drink nutrition is calculated once from the selected volume", () => {
  assert.deepEqual(beverageNutrition(200, "milk"), { kcal: 122, protein: 6.4, carbs: 9.6, fat: 6.6 });
  assert.deepEqual(beverageNutrition(250, "water"), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
});

test("a custom drink keeps its own serving, nutrition and hydration settings", () => {
  const custom = normalizeCustomBeverage({ id: "custom_lemonade", name: "לימונדה", defaultAmount: 300, kcalPer100: 24, carbsPer100: 6, factor: .85 });
  assert.equal(hydrationBeverage(custom.id, [custom]).name, "לימונדה");
  assert.equal(hydrationContribution(300, custom.id, [custom]), 255);
  assert.deepEqual(beverageNutrition(300, custom.id, [custom]), { kcal: 72, protein: 0, carbs: 18, fat: 0 });
});
