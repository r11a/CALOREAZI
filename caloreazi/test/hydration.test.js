import assert from "node:assert/strict";
import test from "node:test";
import { beverageNutrition, hydrationContribution, hydrationTotal } from "../server/hydration.js";

test("water and selected drinks contribute their configured hydration amount", () => {
  assert.equal(hydrationContribution(250, "water"), 250);
  assert.equal(hydrationContribution(200, "coffee"), 190);
  assert.equal(hydrationTotal([{ amount: 250 }, { amount: 200, hydrationMl: 180 }]), 430);
});

test("drink nutrition is calculated once from the selected volume", () => {
  assert.deepEqual(beverageNutrition(200, "milk"), { kcal: 122, protein: 6.4, carbs: 9.6, fat: 6.6 });
  assert.deepEqual(beverageNutrition(250, "water"), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
});
