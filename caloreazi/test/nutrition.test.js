import test from "node:test";
import assert from "node:assert/strict";
import { ageFromBirthDate, calculateDayScore, calculateMealFromItems, calculateNutritionTargets, roundCalories } from "../server/nutrition.js";

test("calories use standard half-up rounding", () => {
  assert.equal(roundCalories(120.4), 120);
  assert.equal(roundCalories(120.5), 121);
  assert.equal(roundCalories(-4.5), 0);
});

test("calculates transparent calorie plan with BMI and activity", () => {
  const plan = calculateNutritionTargets({ sex: "male", age: 35, height: 175, weight: 85, activity: "light", goal: "lose" });
  assert.equal(plan.bmr, 1774);
  assert.equal(plan.bmi, 27.8);
  assert.equal(plan.maintenanceCalories, 2439);
  assert.equal(plan.calories, 2050);
  assert.equal(plan.formula, "Mifflin–St Jeor");
});

test("does not create an automatic deficit for underweight users", () => {
  const plan = calculateNutritionTargets({ sex: "female", age: 30, height: 170, weight: 50, activity: "low", goal: "lose" });
  assert.equal(plan.goalAdjustedForBmi, true);
  assert.ok(plan.calories >= 1400);
});

test("calculates an edited meal from weight and quantity", () => {
  const result = calculateMealFromItems([
    { grams: 120, quantity: 2, kcalPer100: 100, proteinPer100: 10, carbsPer100: 5, fatPer100: 2 },
    { grams: 50, quantity: 1, kcalPer100: 200, proteinPer100: 4, carbsPer100: 20, fatPer100: 8 },
  ]);
  assert.equal(result.kcal, 340);
  assert.equal(result.protein, 26);
  assert.equal(result.carbs, 22);
  assert.equal(result.fat, 9);
});

test("derives age precisely from birth date", () => {
  assert.equal(ageFromBirthDate("1990-09-01", new Date("2026-08-23T12:00:00Z")), 35);
  assert.equal(ageFromBirthDate("1990-08-01", new Date("2026-08-23T12:00:00Z")), 36);
  assert.equal(ageFromBirthDate("not-a-date"), null);
});

test("scores past days with score engine 2 and reports data coverage", () => {
  const result = calculateDayScore({ date: "2026-08-20", waterMl: 1800, meals: [{ kcal: 600, protein: 35, carbs: 70, fat: 18, items: [{ name: "עגבניה", confirmedName: "עגבניה", grams: 200, quantity: 1, kcalPer100: 18, proteinPer100: 1, carbsPer100: 4, fatPer100: 0, fiberPer100: 1.2, nutritionSource: { sourceId: "tomato" } }] }] }, { calories: 1800, protein: 100, carbs: 200, fat: 60, waterMl: 2000 }, []);
  assert.equal(result.version, "2.0");
  assert.equal(result.status, "complete");
  assert.ok(result.coverage > 0 && result.coverage <= 100);
  assert.ok(result.parameters.some((item) => item.key === "produce"));
});
