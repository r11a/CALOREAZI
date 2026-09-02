import assert from "node:assert/strict";
import test from "node:test";
import { applyFoodCorrections, buildFoodCorrections, findPossibleDuplicate } from "../server/food-learning.js";

test("a corrected food becomes a deterministic learned value", () => {
  const corrections = buildFoodCorrections([{ name: "קפה עם חלב", grams: 250, quantity: 1, kcalPer100: 80 }], [{ name: "קפה עם חלב", grams: 200, quantity: 1, kcalPer100: 30, proteinPer100: 1.6 }], "meal_edit");
  const [learned] = applyFoodCorrections([{ name: "קפה עם חלב", grams: 250, quantity: 1, kcalPer100: 80 }], corrections);
  assert.equal(learned.grams, 200);
  assert.equal(learned.kcalPer100, 30);
  assert.equal(learned.proteinPer100, 1.6);
  assert.equal(learned.nutritionSource.source, "USER_CORRECTION");
});

test("learned corrections require an exact normalized food name", () => {
  const corrections = buildFoodCorrections([{ name: "עוגה" }], [{ name: "עוגה", grams: 100, quantity: 1, kcalPer100: 350 }]);
  assert.equal(applyFoodCorrections([{ name: "עוגת גבינה", grams: 100 }], corrections)[0].learnedCorrection, undefined);
});

test("duplicate guard catches only the same meal in a short window", () => {
  const now = new Date("2026-09-02T10:00:00.000Z");
  const meals = [{ id: "recent", name: "יוגורט ופירות", time: "2026-09-02T09:55:00.000Z" }, { id: "old", name: "יוגורט ופירות", time: "2026-09-02T08:00:00.000Z" }];
  assert.equal(findPossibleDuplicate(meals, { name: "יוגורט ופירות", time: now })?.id, "recent");
  assert.equal(findPossibleDuplicate(meals, { name: "חביתה", time: now }), null);
});
