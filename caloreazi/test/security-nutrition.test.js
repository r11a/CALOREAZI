import assert from "node:assert/strict";
import test from "node:test";
import { enrichVisionItems, findNutritionFood } from "../server/nutrition-catalog.js";
import { checkRateLimit, requireSameOrigin } from "../server/security.js";
import { findOwnedMeal, removeOwnedMeal, restoreOwnedMeal } from "../server/domains/meals/repository.js";
import { parseVisionResult } from "../server/meal-analysis.js";

test("nutrition values come from a traceable catalog rather than vision output", () => {
  const result = enrichVisionItems([{ name: "חזה עוף צלוי", grams: 150, quantity: 1, kcalPer100: 999 }]);
  assert.equal(result.items[0].kcalPer100, 165);
  assert.equal(result.items[0].nutritionSource.source, "CALOREAZI_CURATED");
  assert.equal(findNutritionFood("chicken breast").sourceId, "chicken-breast-cooked");
});

test("unknown nutrition matches require confirmation and never inherit AI values", () => {
  const result = enrichVisionItems([{ name: "מאכל לא מוכר", grams: 100, quantity: 1, kcalPer100: 777 }]);
  assert.equal(result.nutritionStatus, "needs_confirmation");
  assert.equal(result.items[0].kcalPer100, 0);
  assert.equal(result.items[0].nutritionSource, null);
});

test("vision parser accepts identification fields without nutrition estimates", () => {
  const result = parseVisionResult('{"name":"ארוחה","items":[{"name":"אורז","grams":150,"quantity":1,"unit":"מנה"}],"confidence":"medium"}');
  assert.deepEqual(Object.keys(result.items[0]).sort(), ["grams", "name", "quantity", "unit"]);
});

test("meal repository enforces ownership across current and historic days", () => {
  const state = { userData: { a: { today: { date: "2026-08-20", waterMl: 0, meals: [] }, history: [{ date: "2026-08-19", waterMl: 0, meals: [{ id: "owned", time: "2026-08-19T10:00:00Z" }] }] }, b: { today: { date: "2026-08-20", waterMl: 0, meals: [{ id: "other", time: "2026-08-20T10:00:00Z" }] } } } };
  assert.equal(findOwnedMeal(state, "a", "other"), null);
  assert.equal(removeOwnedMeal(state, "a", "other"), null);
  const removed = removeOwnedMeal(state, "a", "owned"); assert.equal(removed.id, "owned");
  restoreOwnedMeal(state, "a", removed); assert.equal(findOwnedMeal(state, "a", "owned").meal.id, "owned");
});

test("cross-origin mutations are rejected while same-origin mutations pass", async () => {
  const rejected = requireSameOrigin(new Request("https://app.local/api/test", { method: "POST", headers: { origin: "https://evil.local", host: "app.local" } }));
  assert.equal(rejected.status, 403);
  assert.equal(requireSameOrigin(new Request("https://app.local/api/test", { method: "POST", headers: { origin: "https://app.local", host: "app.local" } })), null);
});

test("sensitive endpoint rate limiter blocks excess attempts", () => {
  const key = `test-${crypto.randomUUID()}`;
  assert.equal(checkRateLimit(key, { limit: 1, windowMs: 60_000 }), null);
  assert.equal(checkRateLimit(key, { limit: 1, windowMs: 60_000 }).status, 429);
});
