import test from "node:test";
import assert from "node:assert/strict";
import { evaluateGoalPlan } from "../server/goal-engine.js";

function trackedDay(date, kcal = 2200) { return { date, meals: [{ kcal: kcal / 2 }, { kcal: kcal / 2 }] }; }
function date(days) { const value = new Date("2026-08-23T12:00:00Z"); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }

test("goal engine waits for sufficient longitudinal data", () => {
  const plan = evaluateGoalPlan({ profile: { goal: "lose", weight: 85, calories: 2200 }, measurements: [{ date: date(-2), weight: 85 }], days: [trackedDay(date(-1))], now: new Date("2026-08-23T12:00:00Z") });
  assert.equal(plan.proposal, null);
  assert.match(plan.status, /לא משנים יעד/);
  assert.ok(plan.calibration.missing.length > 0);
});

test("goal engine proposes only a small change after enough consistent data", () => {
  const measurements = [-21, -14, -7, 0].map((day, index) => ({ date: date(day), weight: 85 - index * .05 }));
  const days = Array.from({ length: 14 }, (_, index) => trackedDay(date(-13 + index), 2200));
  const plan = evaluateGoalPlan({ profile: { goal: "lose", weight: 85, calories: 2200, completedAt: "2026-01-01T00:00:00Z" }, measurements, days, now: new Date("2026-08-23T12:00:00Z") });
  assert.equal(plan.proposal?.delta, -100);
  assert.equal(plan.proposal?.suggestedCalories, 2100);
  assert.ok(plan.calibration.score >= 80);
});

test("goal engine observes the cooldown after an accepted adjustment", () => {
  const measurements = [-21, -14, -7, 0].map((day, index) => ({ date: date(day), weight: 85 - index * .05 }));
  const days = Array.from({ length: 14 }, (_, index) => trackedDay(date(-13 + index)));
  const plan = evaluateGoalPlan({ profile: { goal: "lose", weight: 85, calories: 2100, goalAdjustmentHistory: [{ acceptedAt: "2026-08-20T12:00:00Z" }] }, measurements, days, now: new Date("2026-08-23T12:00:00Z") });
  assert.equal(plan.proposal, null);
});
