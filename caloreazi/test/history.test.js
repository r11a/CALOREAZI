import assert from "node:assert/strict";
import test from "node:test";
import { ensureUserData } from "../server/store.js";
import { entryDateFor, localDateAt, validTimeZone } from "../server/local-date.js";

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

test("rolls an empty day at midnight so the first new entry belongs to today", () => {
  const state = { userData: { u1: { profile: { timeZone: "Asia/Jerusalem" }, today: { date: "2025-01-01", waterMl: 0, waterEvents: [], meals: [] }, history: [] } } };
  const data = ensureUserData(state, "u1");
  assert.equal(data.today.date, localDateAt(new Date(), "Asia/Jerusalem"));
  assert.equal(data.history.length, 0);
});

test("restores an already-created current local day instead of duplicating it", () => {
  const current = localDateAt(new Date(), "Asia/Jerusalem");
  const state = { userData: { u1: { profile: { timeZone: "Asia/Jerusalem" }, today: { date: "2025-01-01", waterMl: 0, meals: [] }, history: [{ date: current, waterMl: 250, waterEvents: [{ id: "w1", amount: 250 }], meals: [] }] } } };
  const data = ensureUserData(state, "u1");
  assert.equal(data.today.date, current);
  assert.equal(data.today.waterMl, 250);
  assert.equal(data.history.some((day) => day.date === current), false);
});

test("manual day mode keeps a shift open after midnight and assigns new entries to it", () => {
  const state = { userData: { u1: { profile: { timeZone: "Asia/Jerusalem", dayBoundaryMode: "manual", activeDayDate: "2025-01-01" }, today: { date: "2025-01-01", waterMl: 250, meals: [{ id: "shift-meal" }] }, history: [] } } };
  const data = ensureUserData(state, "u1");
  assert.equal(data.today.date, "2025-01-01");
  assert.equal(data.today.meals[0].id, "shift-meal");
  assert.equal(entryDateFor(data, new Date()), "2025-01-01");
});
