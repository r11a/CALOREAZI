import test from "node:test";
import assert from "node:assert/strict";
import { calculateMealFromItems, calculateNutritionTargets } from "../server/nutrition.js";

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
  assert.deepEqual(result, { kcal: 340, protein: 26, carbs: 22, fat: 9 });
});
