import test from "node:test";
import assert from "node:assert/strict";
import { assessMealReliability } from "../server/meal-reliability.js";

test("explicit per-unit values receive a transparent high-confidence audit", () => {
  const report = assessMealReliability({ source: "manual", items: [{ name: "פריכית", grams: 8, quantity: 5, kcalPerUnit: 24, explicitCalories: true }] });
  assert.equal(report.score, 99);
  assert.equal(report.level, "high");
  assert.equal(report.items[0].formula, "24 × 5 = 120 קק״ל");
});

test("photo estimates are intentionally scored below authoritative sources", () => {
  const photo = assessMealReliability({ source: "photo", items: [{ name: "עוגה", grams: 100, quantity: 1, kcalPer100: 350, nutritionStatus: "estimated", nutritionSource: { source: "AI_ESTIMATE" } }] });
  const catalog = assessMealReliability({ source: "manual", items: [{ name: "עוגה", grams: 100, quantity: 1, kcalPer100: 350, nutritionStatus: "matched", nutritionSource: { source: "CALOREAZI_CURATED" } }] });
  assert.ok(photo.score < catalog.score);
  assert.equal(photo.items[0].source, "הערכת AI");
});

test("missing calories reduce coverage and reliability", () => {
  const report = assessMealReliability({ source: "photo", items: [{ name: "פריט לא מזוהה", grams: 100, quantity: 1 }] });
  assert.equal(report.coverage, 0);
  assert.equal(report.level, "low");
});
