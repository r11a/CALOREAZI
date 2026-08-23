import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const expansionCss = await readFile(new URL("../app/expansion.css", import.meta.url), "utf8");
const adminUsersRoute = await readFile(new URL("../app/api/admin/users/route.ts", import.meta.url), "utf8");
const notificationsRoute = await readFile(new URL("../app/api/notifications/route.ts", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const notificationScheduler = await readFile(new URL("../server/notification-scheduler.js", import.meta.url), "utf8");
const analyzeTextRoute = await readFile(new URL("../app/api/ai/analyze-text/route.ts", import.meta.url), "utf8");
const partnershipsRoute = await readFile(new URL("../app/api/partnerships/route.ts", import.meta.url), "utf8");
const coachRoute = await readFile(new URL("../app/api/ai/chat/route.ts", import.meta.url), "utf8");
const store = await readFile(new URL("../server/store.js", import.meta.url), "utf8");
const offlineQueue = await readFile(new URL("../app/offline-queue.ts", import.meta.url), "utf8");
const waterRoute = await readFile(new URL("../app/api/water/route.ts", import.meta.url), "utf8");
const activityRoute = await readFile(new URL("../app/api/activity/route.ts", import.meta.url), "utf8");
const mealsRoute = await readFile(new URL("../app/api/meals/route.ts", import.meta.url), "utf8");

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

test("editing a meal exposes an explicit save changes and close action", () => {
  assert.match(page, /editingMealId\s*\?\s*"שמור שינויים וסגור"/);
  assert.match(page, /meal-modal\$\{editingMealId \? " is-editing" : ""\}/);
});

test("photo meals automatically complete calories and remain recalculable after edits", () => {
  assert.match(page, /completeMissingNutrition/);
  assert.match(page, /חשב מחדש לפי השינויים/);
  assert.match(page, /קלוריות לכמות שנבחרה/);
  assert.match(analyzeTextRoute, /proteinPer100 \* 4/);
});

test("home greeting opens the shared add menu and that menu exposes meal capture", () => {
  assert.match(page, /welcome-add-button/);
  assert.match(page, /setQuickAddOpen\(true\)/);
  assert.match(page, /capture-meal-entry/);
  assert.match(page, /צלם ארוחה/);
  assert.match(page, /uploadInput\.current\?\.click\(\)/);
  assert.doesNotMatch(page, /manual-camera-action/);
});

test("history meal pictures open the full meal preview and return to history", () => {
  assert.match(page, /openMealPreview\(meal, true\)/);
  assert.match(page, /mealPreviewReturnToHistory/);
  assert.match(page, /חזרה להיסטוריה/);
});

test("macro detail lists are sorted from the largest gram contribution", () => {
  assert.match(page, /sort\(\(a, b\) => Number\(b\.protein \|\| 0\) - Number\(a\.protein \|\| 0\)\)/);
  assert.match(page, /sort\(\(a, b\) => Number\(b\.carbs \|\| 0\) - Number\(a\.carbs \|\| 0\)\)/);
  assert.match(page, /sort\(\(a, b\) => Number\(b\.fat \|\| 0\) - Number\(a\.fat \|\| 0\)\)/);
});

test("admin operational logs stay inside their tab and trends expose a monthly comparison", () => {
  assert.match(page, /adminTab === "audit" && <section className="admin-users admin-operations" id="admin-audit"/);
  assert.match(page, /תמונת מצב ל־30 ימים/);
  assert.match(page, /monthlyAverageCalories/);
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

test("offline outbox covers core entries and birth date shows the calculated age", () => {
  assert.match(page, /flushOfflineMutations/);
  assert.match(page, /queueMutation\("\/api\/meals"/);
  assert.match(page, /queueMutation\("\/api\/water"/);
  assert.match(page, /queueMutation\("\/api\/measurements"/);
  assert.match(page, /queueMutation\("\/api\/activity"/);
  assert.match(page, /גיל מחושב:/);
  assert.match(page, /הגיל שלך:/);
});

test("offline sync center exposes queue health, ordered retry and original timestamps", () => {
  assert.match(page, /מרכז הסנכרון/);
  assert.match(page, /retryOfflineItem/);
  assert.match(page, /הסנכרון דורש טיפול/);
  assert.match(offlineQueue, /listOfflineQueue/);
  assert.match(offlineQueue, /attempts:/);
  assert.match(offlineQueue, /createdAt\.localeCompare/);
  assert.match(waterRoute, /recordedAt/);
  assert.match(waterRoute, /eventDate/);
  assert.match(activityRoute, /recordedAt/);
  assert.match(activityRoute, /localDate/);
  assert.match(page, /mealEditBaseUpdatedAt/);
  assert.match(mealsRoute, /editConflict/);
  assert.match(mealsRoute, /status: 409/);
  assert.match(css, /sync-center/);
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
  assert.match(page, /maxSize = 960, quality = 0\.65/);
  assert.match(page, /attempt < 8 \? 250 : 500/);
  assert.match(page, /audioBitsPerSecond: 32_000/);
  assert.match(page, /localTranscript/);
  assert.match(page, /JSON\.stringify\(\{ browserTranscript: localTranscript \}\)/);
});

test("meal capture presents a simple review with optional advanced controls", () => {
  assert.match(page, /meal-review-intro/);
  assert.match(page, /מוכן לבדיקה ולאישור/);
  assert.match(page, /יש טעות\? ערוך/);
  assert.match(page, /אישור והוספה ליומן/);
  assert.match(page, /adjustMealItem/);
  assert.match(page, /adjustMealForm/);
  assert.match(css, /number-stepper/);
  assert.match(css, /min-width:44px/);
});

test("photo capture skips manual entry and shows a focused animated recognition state", () => {
  assert.match(page, /setManualAiMode\(false\)/);
  assert.match(page, /photo-analyzing/);
  assert.match(page, /מזהה מה יש בתמונה/);
  assert.match(page, /recognition-stars/);
  assert.match(page, /צריך צילום ברור יותר/);
  assert.match(css, /scan-progress/);
  assert.match(css, /photo-review-hero/);
});

test("photo preparation reuses the decoded image and voice does not auto-favorite meals", () => {
  assert.match(page, /prepareImage\(file, navigator\.onLine \? 960 : 720/);
  assert.match(page, /decodedImage\?: HTMLImageElement/);
  assert.match(page, /setSaveToLibrary\(false\)/);
});

test("meal review supports focused AI correction and calm consistency badges", () => {
  assert.match(page, /correctMealWithAi/);
  assert.match(page, /תקן עם AI/);
  assert.match(page, /consistencyBadges/);
  assert.match(page, /Number\(state\?\.streak \|\| 0\)/);
  assert.match(css, /ai-correction-box/);
  assert.match(css, /consistency-badges/);
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

test("forgotten meals support several dated AI-calculated drafts before confirmation", () => {
  assert.match(page, /שכחתי לעדכן/);
  assert.match(page, /calculateForgottenMeals/);
  assert.match(page, /saveForgottenMeals/);
  assert.match(page, /שלשום/);
  assert.match(page, /הוסף ארוחה נוספת/);
  assert.match(page, /אישור והוספת הכל ליומן/);
  assert.match(css, /forgotten-modal/);
  assert.match(css, /forgotten-stepper/);
});

test("internal sharing exposes persistent decisions and four independent permissions", () => {
  assert.match(page, /partnership-invite-card/);
  assert.match(page, /updatePartnership\(link\.id, "reject"\)/);
  assert.match(page, /partnerForm\.trends/);
  assert.match(page, /מגמות וציונים/);
  assert.match(css, /partnership-invite-card/);
});

test("expanded tracking keeps cycles, water events and calm goals", () => {
  assert.match(page, /נעים להכיר/);
  assert.match(page, /startNewCycle/);
  assert.match(page, /calculateActivityWithAi/);
  assert.match(page, /calmChallenges/);
  assert.match(page, /timeline-water/);
  assert.match(page, /waterByHour/);
  assert.match(page, /timeline-image-button/);
  assert.match(page, /timeline-image-button timeline-icon/);
  assert.match(css, /meal-preview-layer\{z-index:120\}/);
  assert.match(css, /water-hours-insight/);
});

test("mobile notifications are opt-in and calorie overage remains reversible", () => {
  assert.match(page, /Notification\.requestPermission/);
  assert.match(page, /pushManager\.subscribe/);
  assert.match(page, /\/api\/notifications/);
  assert.match(page, /display-mode: standalone/);
  assert.match(page, /calorieOverage/);
  assert.match(page, /ערוך ארוחה/);
  assert.match(page, /בטל את ההוספה/);
  assert.match(css, /overage-modal/);
  assert.match(notificationsRoute, /sendPush/);
  assert.match(notificationsRoute, /notifications\.subscribed/);
  assert.match(serviceWorker, /addEventListener\("push"/);
  assert.match(serviceWorker, /showNotification/);
  assert.match(serviceWorker, /notificationclick/);
});

test("notification preferences are granular, scheduled and respect quiet hours", () => {
  assert.match(page, /notificationTypeOptions/);
  assert.match(page, /תזכורות ארוחות/);
  assert.match(page, /סיכום יומי/);
  assert.match(page, /המלצות המאמן/);
  assert.match(page, /מגמות שבועיות/);
  assert.match(page, /שעות שקטות/);
  assert.match(page, /notification-live-status/);
  assert.match(notificationScheduler, /processDueNotifications/);
  assert.match(notificationScheduler, /notificationIsQuiet\(clock\.minutes/);
  assert.match(notificationScheduler, /maxPerDay/);
  assert.match(notificationScheduler, /14 \* 86400000/);
});

test("admin can securely update a user email or password", () => {
  assert.match(page, /updateAdminUserCredentials/);
  assert.match(page, /שמור מייל ו\/או סיסמה/);
  assert.match(page, /autoComplete="new-password"/);
  assert.match(adminUsersRoute, /user\.email_changed/);
  assert.match(adminUsersRoute, /האימייל כבר משויך למשתמש אחר/);
  assert.match(adminUsersRoute, /סיסמה חדשה חייבת להכיל לפחות 10 תווים/);
});

test("manual meal value choices share one clear icon-led action row", () => {
  assert.match(page, /manual-value-actions/);
  assert.match(page, /name="calculator"/);
  assert.match(page, /חשב ערכים/);
  assert.match(page, /name="list"/);
  assert.match(page, /יש לי ערכים/);
  assert.match(css, /manual-value-actions\{[^}]*grid-template-columns:1fr 1fr/);
});

test("sharing uses current usernames and never falls back to a remembered email", () => {
  assert.match(page, /מוצגים שמות משתמש בלבד/);
  assert.match(partnershipsRoute, /requestedIds/);
  assert.doesNotMatch(partnershipsRoute, /String\(user\.email\)/);
  assert.match(store, /username && !username\.includes\("@"\)/);
});

test("the optional acquaintance questionnaire opens from account and informs coach context", () => {
  assert.match(page, /acquaintance-entry/);
  assert.match(page, /כל השדות לא חובה/);
  assert.match(page, /dailySchedule/);
  assert.match(page, /mealPattern/);
  assert.match(page, /cookingAccess/);
  assert.match(page, /emotionalEating/);
  assert.match(page, /coachingStyle/);
  assert.match(css, /acquaintance-modal/);
  assert.match(coachRoute, /acquaintance: profile\.acquaintance/);
});

test("meal add flows wait for an explicit field tap before opening the keyboard", () => {
  assert.doesNotMatch(page, /<input\s+autoFocus/);
  assert.match(page, /aria-label="חיפוש בהוספת אוכל"/);
});

test("meal source actions share white icons on orange while food categories stay untouched", () => {
  assert.match(page, /capture-meal-entry add-source-entry/);
  assert.match(page, /forgotten-meal-entry add-source-entry/);
  assert.match(page, /className="add-source-entry" onClick=\{\(\) => setVoiceOpen/);
  assert.match(css, /category-grid \.add-source-entry \.manual-meal-art\{[^}]*color:#fff[^}]*var\(--orange\)/);
  assert.doesNotMatch(page, /className="add-source-entry" onClick=\{\(\) => setQuickCategory/);
});
