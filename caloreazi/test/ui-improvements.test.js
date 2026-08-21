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

test("favorites, online food search, weight selection and mobile accessibility are present", () => {
  assert.match(page, /libraryQuery/);
  assert.match(page, /state\.favorites/);
  assert.match(page, /onlineFoodResults/);
  assert.match(page, /quickFoodWeight/);
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

test("meal save explains missing fields, infers safe values and blocks duplicate submissions", () => {
  assert.match(page, /mealValidationErrors/);
  assert.match(page, /macroCalories/);
  assert.match(page, /כדי לשמור צריך להשלים/);
  assert.match(page, /mealSaveInFlight/);
  assert.match(css, /meal-save-feedback/);
});

test("coach can clear only its visible transcript and offers practical help prompts", () => {
  assert.match(page, /setMessages\(\[\]\)/);
  assert.match(page, /ניקוי התצוגה בלבד; ההיסטוריה נשמרת/);
  assert.match(page, /HELP: איך מוסיפים ארוחה/);
  assert.match(page, /איך משנים יעדים/);
});

test("history daily summary follows the five-band score color", () => {
  assert.match(page, /history-calories score-/);
  assert.match(css, /history-calories\.score-red/);
  assert.match(css, /history-calories\.score-green/);
});

test("insights supports dated weight updates and a readable weight trend", () => {
  assert.match(page, /saveTrendWeight/);
  assert.match(page, /weightChartPoints/);
  assert.match(page, /גרף היסטוריית משקל/);
  assert.match(page, /כל עדכון נשמר כמדידה חדשה/);
  assert.match(css, /weight-history-chart/);
  assert.match(page, /current-weight-field/);
  assert.match(page, /המדידה האחרונה/);
});

test("trend progress bars identify the metric, actual value, target and meaning", () => {
  assert.match(page, /ממוצע 7 ימים מול היעדים שלך/);
  assert.match(page, /actual: insightsData\.summary\.averageCalories/);
  assert.match(page, /actual: insightsData\.summary\.averageWater/);
  assert.match(page, /הפס מציג אחוז מהיעד/);
  assert.match(css, /weekly-goal-progress/);
});

test("sugar-risk profiles receive dietary sugar summaries without claiming blood glucose", () => {
  assert.match(page, /insightsData\.sugar\?\.enabled/);
  assert.match(page, /סוכרים תזונתיים משוערים/);
  assert.match(page, /לא גלוקוז בדם/);
  assert.match(page, /ממוצע 30 ימים/);
  assert.match(css, /sugar-chart/);
});

test("meals can inherit one lightweight image across today and history without blocking save", () => {
  assert.match(page, /\/api\/meals\/image/);
  assert.match(page, /imageCompleted/);
  assert.match(page, /loading="lazy" decoding="async"/);
});

test("home meal suggestions combine macro gaps with an optional taste wizard", () => {
  assert.match(page, /mealSuggestionCatalog/);
  assert.match(page, /mealSuggestions/);
  assert.match(page, /מה כדאי לאכול עכשיו/);
  assert.match(page, /tasteQuestions/);
  assert.match(page, /setTasteChoice/);
  assert.match(page, /tasteProfile/);
  assert.match(css, /meal-suggestions-panel/);
  assert.match(css, /taste-wizard/);
});
