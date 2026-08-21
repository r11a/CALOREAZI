import assert from "node:assert/strict";
import test from "node:test";
import { hydrateDatabaseState } from "../server/state-database.js";

test("database hydration assigns today using the user's timezone", () => {
  const state = hydrateDatabaseState({
    users: [{ id: "user-1" }],
    profiles: { "user-1": { timeZone: "Asia/Jerusalem" } },
    days: [{ userId: "user-1", payload: { date: "2026-08-21", waterMl: 0 } }],
    meals: [{ userId: "user-1", localDate: "2026-08-21", payload: { id: "meal-1", time: "2026-08-21T05:39:00.000Z" } }],
  }, new Date("2026-08-20T21:30:00.000Z"));
  assert.equal(state.userData["user-1"].today.date, "2026-08-21");
  assert.equal(state.userData["user-1"].today.meals[0].id, "meal-1");
  assert.equal(state.userData["user-1"].history.length, 0);
});

test("invalid legacy day labels are repaired from the meal timestamp", () => {
  const state = hydrateDatabaseState({
    users: [{ id: "user-1" }],
    profiles: { "user-1": { timeZone: "Asia/Jerusalem" } },
    meals: [{ userId: "user-1", localDate: "Invalid Date", payload: { id: "meal-1", time: "2026-08-21T05:39:00.000Z" } }],
  }, new Date("2026-08-21T06:00:00.000Z"));
  assert.equal(state.userData["user-1"].today.date, "2026-08-21");
  assert.equal(state.userData["user-1"].today.meals[0].id, "meal-1");
});

test("empty invalid legacy day records are hidden", () => {
  const state = hydrateDatabaseState({
    users: [{ id: "user-1" }],
    profiles: { "user-1": { timeZone: "Asia/Jerusalem" } },
    days: [{ userId: "user-1", payload: { date: "Invalid Date", waterMl: 0 } }],
  }, new Date("2026-08-21T06:00:00.000Z"));
  assert.equal(state.userData["user-1"].history.length, 0);
  assert.notEqual(state.userData["user-1"].today.date, "Invalid Date");
});
