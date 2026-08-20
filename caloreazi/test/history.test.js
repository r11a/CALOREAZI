import assert from "node:assert/strict";
import test from "node:test";
import { ensureUserData } from "../server/store.js";
import { localDateAt, validTimeZone } from "../server/local-date.js";

test("uses the user's local midnight instead of UTC", () => {
  const instant = new Date("2026-08-20T21:30:00.000Z");
  assert.equal(localDateAt(instant, "Asia/Jerusalem"), "2026-08-21");
  assert.equal(localDateAt(instant, "UTC"), "2026-08-20");
  assert.equal(validTimeZone("not/a-zone"), process.env.TZ || "Asia/Jerusalem");
});

test("rolls a completed day into per-user history without losing meals", () => {
  const state = { userData: { u1: { profile: {}, today: { date: "2025-01-01", waterMl: 750, meals: [{ id: "m1", kcal: 300 }] } } } };
  const data = ensureUserData(state, "u1");
  assert.equal(data.history.length, 1);
  assert.equal(data.history[0].meals[0].id, "m1");
  assert.equal(data.today.meals.length, 0);
  assert.ok(data.today.date > "2025-01-01");
});
