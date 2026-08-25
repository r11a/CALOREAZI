import test from "node:test";
import assert from "node:assert/strict";
import { nutritionConfidence, validateMealNutrition } from "../server/meal-validation.js";
import { cacheFoodSearch, cachedFoodSearch, clearFoodSearchCache } from "../server/food-search-cache.js";

test("meal validation blocks implausible photographed coffee", () => {
  const result = validateMealNutrition({ kcal: 1373, protein: 19, carbs: 138, fat: 83, items: [{ name: "קפה עם חלב", grams: 250, quantity: 1, kcalPer100: 549 }] });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "implausible_beverage"));
});

test("meal validation accepts a realistic coffee", () => {
  const result = validateMealNutrition({ kcal: 90, protein: 5, carbs: 9, fat: 4, items: [{ name: "קפה עם חלב", grams: 250, quantity: 1, kcalPer100: 36 }] });
  assert.equal(result.valid, true);
});

test("meal validation flags an implausibly low cake estimate", () => {
  const result = validateMealNutrition({
    kcal: 30,
    protein: 1,
    carbs: 5,
    fat: 1,
    items: [{ name: "עוגת קרמל", grams: 100, quantity: 1, kcalPer100: 30 }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "implausible_energy_density"));
});

test("nutrition confidence distinguishes government and community sources", () => {
  assert.equal(nutritionConfidence({ source: "משרד הבריאות", kcal: 100, protein: 1, carbs: 20, fat: 1 }).level, "high");
  assert.equal(nutritionConfidence({ source: "Open Food Facts", barcode: "7290000000000", kcal: 100, protein: 1, carbs: 20, fat: 1 }).level, "medium");
});

test("food search cache is bounded by TTL and returns a clone", async () => {
  clearFoodSearchCache();
  const original = { products: [{ name: "קוטג׳" }] };
  cacheFoodSearch("query:קוטג", original, 20);
  const cached = cachedFoodSearch("query:קוטג");
  cached.products[0].name = "changed";
  assert.equal(cachedFoodSearch("query:קוטג").products[0].name, "קוטג׳");
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(cachedFoodSearch("query:קוטג"), null);
});
