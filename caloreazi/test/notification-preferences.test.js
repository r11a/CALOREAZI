import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNotificationPreferences } from "../server/notification-preferences.js";
import { candidateMessages, notificationIsDue, notificationIsQuiet } from "../server/notification-scheduler.js";

test("quiet hours work across midnight and outside the quiet window", () => {
  assert.equal(notificationIsQuiet(23 * 60, "22:30", "07:00"), true);
  assert.equal(notificationIsQuiet(6 * 60 + 30, "22:30", "07:00"), true);
  assert.equal(notificationIsQuiet(12 * 60, "22:30", "07:00"), false);
});

test("notification delivery uses a bounded five-minute scheduler window", () => {
  assert.equal(notificationIsDue(9 * 60, "09:00"), true);
  assert.equal(notificationIsDue(9 * 60 + 4, "09:00"), true);
  assert.equal(notificationIsDue(9 * 60 + 5, "09:00"), false);
});

test("notification preferences reject invalid times and excessive daily volume", () => {
  const preferences = normalizeNotificationPreferences({ quietStart: "88:91", maxPerDay: 99, coachTips: false });
  assert.equal(preferences.quietStart, "22:30");
  assert.equal(preferences.maxPerDay, 5);
  assert.equal(preferences.coachTips, false);
});

test("daily notification limit supports five-step choices up to twenty", () => {
  for (const maxPerDay of [5, 10, 15, 20]) assert.equal(normalizeNotificationPreferences({ maxPerDay }).maxPerDay, maxPerDay);
});

test("coach checks gaps during the day and sends three useful progress summaries", () => {
  const data = { today: { date: "2026-08-23", waterMl: 500, meals: [{ period: "breakfast", kcal: 420, protein: 12, carbs: 55, fat: 15, items: [] }] }, history: [], activity: [], measurements: [], profile: { calories: 1950, protein: 130, carbs: 210, fat: 65, waterMl: 2000 } };
  const preferences = normalizeNotificationPreferences({ maxPerDay: 20 });
  const at = (value) => candidateMessages(data, preferences, { date: "2026-08-23", minutes: value, weekday: "Sun" }, "רונן");
  assert.ok(at(10 * 60 + 30).some((item) => item.type === "coach-morning"));
  assert.ok(at(12 * 60).some((item) => item.type === "progress-noon"));
  assert.ok(at(16 * 60).some((item) => item.type === "progress-afternoon"));
  assert.ok(at(20 * 60).some((item) => item.type === "progress-evening"));
});
