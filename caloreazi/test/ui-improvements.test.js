import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const expansionCss = await readFile(new URL("../app/expansion.css", import.meta.url), "utf8");

test("health profile is editable and explicitly bounded as non-medical advice", () => {
  for (const field of ["diabetesStatus", "hypertension", "foodAllergies", "relevantMedications", "pregnancyStatus"])
    assert.match(page, new RegExp(field));
  assert.match(page, /אינו תחליף לייעוץ רפואי/);
});

test("meal rows expose one clear edit action while deletion undo stays available", () => {
  assert.match(page, /editingMealId/);
  assert.doesNotMatch(page, /className="meal-quantity"/);
  assert.doesNotMatch(page, /className="meal-favorite"/);
  assert.match(page, /undoDeleteMeal/);
});

test("food library filters and mobile accessibility rules are present", () => {
  assert.match(page, /libraryQuery/);
  assert.match(page, /libraryCategory/);
  assert.match(page, /libraryVisibility/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("dark streak card and mobile meal timeline have explicit responsive layouts", () => {
  assert.match(expansionCss, /\.theme-dark \.streak/);
  assert.match(expansionCss, /\.meal-list article\{[^}]*display:grid!important;grid-template-columns:48px minmax\(0,1fr\) auto/);
});

test("admin exposes runtime version, AI fallbacks and backup policy", () => {
  assert.match(page, /adminHealth\.version/);
  assert.match(page, /visionFallbackModel/);
  assert.match(page, /backupType/);
  assert.match(page, /30_000/);
});

test("admin exposes database diagnostics and recoverable storage synchronization", () => {
  assert.match(page, /admin-database/);
  assert.match(page, /maintainDatabase/);
  assert.match(page, /storagePendingMedia/);
  assert.match(page, /syncStorage/);
  assert.match(expansionCss, /admin-tab-database/);
});

test("photo capture communicates quality, confidence, offline state and save result", () => {
  assert.match(page, /photoQuality/);
  assert.match(page, /mealConfidence/);
  assert.match(page, /offlineQueueCount/);
  assert.match(page, /meal-result-toast/);
  assert.match(css, /photo-quality/);
});

test("dashboard explains its dynamic score and separates calorie target from consumption", () => {
  assert.match(page, /daily-score-details score-/);
  assert.match(page, /scoreGuidance/);
  assert.match(page, /כמות קלוריות יומית/);
  assert.match(page, /נותרו להיום/);
  assert.match(css, /score-red/);
  assert.match(css, /score-blue/);
});

test("history opens with a navigable score-colored calendar and one selected day", () => {
  assert.match(page, /history-calendar/);
  assert.match(page, /moveHistoryMonth/);
  assert.match(page, /setHistorySelectedDate/);
  assert.match(page, /activeHistoryDay/);
  assert.match(css, /calendar-grid/);
});

test("photo and voice use compact fast paths with fallbacks", () => {
  assert.match(page, /maxSize = 1280, quality = 0\.76/);
  assert.match(page, /audioBitsPerSecond: 32_000/);
  assert.match(page, /localTranscript/);
  assert.match(page, /JSON\.stringify\(\{ browserTranscript: localTranscript \}\)/);
});
