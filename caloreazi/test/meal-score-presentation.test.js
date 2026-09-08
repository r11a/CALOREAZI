import test from "node:test";
import assert from "node:assert/strict";
import { calculateMealScore, mealScorePresentation } from "../server/nutrition.js";

test("meal score uses the requested inclusive color boundaries", () => {
  for (const [score, tone] of [[0,"red"],[30,"red"],[31,"orange"],[50,"orange"],[51,"yellow"],[70,"yellow"],[71,"light-green"],[90,"light-green"],[91,"sky-blue"],[100,"sky-blue"]])
    assert.deepEqual(mealScorePresentation({ score }), { score, tone });
});
test("old meals reuse the existing calculation; stored zero stays zero", () => {
  const meal = { kcal: 400, protein: 25, items: [{ name: "food" }] };
  assert.equal(mealScorePresentation(meal).score, calculateMealScore(meal));
  assert.equal(mealScorePresentation({ ...meal, score: 0 }).score, 0);
  assert.equal(mealScorePresentation({ score: 110 }).score, 100);
  assert.equal(mealScorePresentation({ score: -10 }).score, 0);
});
test("water and beverage records never receive a meal badge", () => {
  for (const item of [{ beverageEntry: true }, { hydrationEventId: "water1" }, { kind: "water" }, { category: "drinks" }])
    assert.equal(mealScorePresentation({ score: 95, ...item }), null);
});
