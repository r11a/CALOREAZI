import assert from "node:assert/strict";
import test from "node:test";
import { ensureUserData } from "../server/store.js";

test("rolls a completed day into per-user history without losing meals", () => {
  const state = { userData: { u1: { profile: {}, today: { date: "2025-01-01", waterMl: 750, meals: [{ id: "m1", kcal: 300 }] } } } };
  const data = ensureUserData(state, "u1");
  assert.equal(data.history.length, 1);
  assert.equal(data.history[0].meals[0].id, "m1");
  assert.equal(data.today.meals.length, 0);
  assert.ok(data.today.date > "2025-01-01");
});
