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
const speechRoute = await readFile(new URL("../app/api/ai/speech/route.ts", import.meta.url), "utf8");
const store = await readFile(new URL("../server/store.js", import.meta.url), "utf8");
const offlineQueue = await readFile(new URL("../app/offline-queue.ts", import.meta.url), "utf8");
const waterRoute = await readFile(new URL("../app/api/water/route.ts", import.meta.url), "utf8");
const activityRoute = await readFile(new URL("../app/api/activity/route.ts", import.meta.url), "utf8");
const mealsRoute = await readFile(new URL("../app/api/meals/route.ts", import.meta.url), "utf8");
const dayRoute = await readFile(new URL("../app/api/day/route.ts", import.meta.url), "utf8");
const favoritesRoute = await readFile(new URL("../app/api/favorites/route.ts", import.meta.url), "utf8");

test("shift workers can keep an active day open and complete it explicitly", () => {
  assert.match(page, /רק כשאני לוחץ „סיים יום”/);
  assert.match(page, /finish-day-button/);
  assert.match(page, /סיים והתחל יום חדש/);
  assert.match(dayRoute, /day\.completed_manually/);
  assert.match(mealsRoute, /entryDateFor/);
  assert.match(waterRoute, /entryDateFor/);
});

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
  assert.match(page, /חשב מחדש/);
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

test("coach uses concise human Hebrew and offers persistent male or female cloud voices", () => {
  assert.match(coachRoute, /טון בונה, סבלני ומכבד/);
  assert.match(coachRoute, /לכל היותר ב-3 מספרים/);
  assert.match(page, /המאמן האישי שלך/);
  assert.match(page, /coach-voice-profile/);
  assert.match(page, /coachVoiceProvider/);
  assert.match(page, /<option value="male-warm">גברי/);
  assert.match(page, /<option value="female-warm">נשי/);
  assert.doesNotMatch(page, /data\.usage\.totalTokens/);
  assert.match(speechRoute, /gemini-2\.5-flash-preview-tts:generateContent/);
  assert.match(speechRoute, /gpt-4o-mini-tts/);
  assert.match(speechRoute, /בונה וסבלני/);
  assert.match(page, /recognition\.continuous = true/);
  assert.match(page, /שולח ל\$\{coachRole\} ומכין תשובה/);
  assert.match(page, /coachName/);
  assert.match(page, /userAddressGender/);
  assert.match(page, /chat-message-row/);
  assert.match(page, /לחץ כדי לעצור ולשלוח/);
  assert.match(page, /sendCoachText\(text, true\)/);
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
  assert.match(page, /unified-meal-result/);
  assert.match(page, /meal-result-rings/);
  assert.match(page, /ציון זיהוי/);
  assert.match(page, /meal-preview-recognition/);
  assert.match(page, /צריך צילום ברור יותר/);
  assert.match(css, /scan-progress/);
  assert.match(css, /photo-review-hero/);
  assert.match(expansionCss, /\.modal-layer>\.meal-modal\{display:block!important/);
  assert.match(expansionCss, /touch-action:pan-y/);
  assert.match(expansionCss, /meal-ring-fill/);
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

test("coach can clear only its visible transcript and moves focused prompts into help", () => {
  assert.match(page, /setMessages\(\[\]\)/);
  assert.match(page, /ניקוי התצוגה בלבד; ההיסטוריה נשמרת/);
  assert.match(page, /מה כדאי לי לאכול עכשיו/);
  assert.match(page, /עזרה בשימוש באפליקציה/);
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
  assert.match(notificationScheduler, /\[\["12:00","noon"\],\["16:00","afternoon"\],\["20:00","evening"\]\]/);
  assert.match(notificationScheduler, /\[\["10:30","morning"\],\["12:30","noon"\]/);
});

test("coach recommendations rotate, food refresh changes results and score quality explains itself", () => {
  assert.match(page, /suggestionRefresh \* 3/);
  assert.match(page, /qualityGap/);
  assert.match(page, /אפשר לחזק את הסיבים/);
  assert.match(page, /dayProgress/);
  assert.match(page, /movingWithGoal/);
  assert.match(page, /nextMeal/);
  assert.match(page, /weight-chart-point/);
  assert.match(page, /part\.why/);
  assert.match(page, /הציון מחושב אוטומטית במנוע 2\.0/);
  assert.doesNotMatch(page, /<summary>ניתוח היום לפי מנוע הציון/);
});

test("adaptive training goal plan is transparent and workouts use a fast path", () => {
  assert.match(page, /api\("\/api\/goal-plan"\)/);
  assert.match(page, /המסלול שלי/);
  assert.match(page, /קצב המסלול/);
  assert.match(page, /שום יעד לא משתנה ללא אישורך/);
  assert.match(page, /activity-quick-types/);
  assert.match(page, /פרטים נוספים — לא חובה/);
  assert.match(css, /goal-plan-calibration/);
  assert.match(page, /נקודת הכניסה שלך/);
  assert.match(page, /כבר בתהליך/);
  assert.match(page, /שינוי משוער ב־4 השבועות האחרונים/);
  assert.match(page, /המידע הוא דיווח עצמי/);
  assert.match(page, /journey-existing-details/);
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

test("history deletion masks meal passwords and supports legacy water entries", () => {
  assert.doesNotMatch(page, /window\.prompt\("מחיקת ארוחה/);
  assert.match(page, /history-password-modal/);
  assert.match(page, /type="password" autoComplete="current-password"/);
  assert.match(page, /String\(meal\.id \|\| meal\.time\)/);
});

test("bottom navigation keeps trends visible and exposes admin from the header", () => {
  assert.match(page, /openNavigationScreen\("insights"\)[\s\S]{0,160}מגמות/);
  assert.doesNotMatch(page, /openNavigationScreen\(isAdmin \? "admin" : "insights"\)/);
  assert.match(page, /admin-header-settings/);
  assert.doesNotMatch(page, /admin-center-entry/);
  assert.match(page, /מרכז ניהול ADMIN/);
});

test("admin uses a focused control-center workspace", () => {
  assert.match(page, /admin-workspace/);
  assert.match(page, /admin-content/);
  assert.match(page, /admin-page-heading/);
  assert.match(expansionCss, /grid-template-columns:238px minmax\(0,1fr\)/);
  assert.match(expansionCss, /admin-center\.admin-tab-trash \.admin-content>#admin-trash/);
  assert.match(page, /admin-mobile-nav/);
  assert.match(page, /aria-label="בחירת אזור במרכז הניהול"/);
  assert.match(expansionCss, /admin-workspace>\.admin-nav\{display:none\}/);
});

test("coach supports a complete opt-in voice conversation", () => {
  assert.match(page, /speechSynthesis/);
  assert.match(page, /SpeechSynthesisUtterance/);
  assert.match(page, /sendCoachText\(text, true\)/);
  assert.match(page, /coach-voice-profile/);
  assert.match(page, /stopCoachListening/);
  assert.match(page, /\/api\/ai\/transcribe/);
  assert.match(page, /coach-voice-status/);
  assert.match(page, /message-speak/);
  assert.match(page, /עצירה ושליחת ההודעה/);
  assert.match(page, /unlockCoachAudio/);
  assert.match(page, /decodeAudioData/);
  assert.match(page, /audio\.onplay = \(\) =>[\s\S]{0,120}setCoachSpeaking\(true\)/);
  assert.match(page, /coachSpeechRequest\.current\?\.abort/);
  assert.match(page, /coachSendInFlight\.current/);
  assert.match(page, /לא הופעל קול נוסף/);
  assert.match(page, /voiceMode: speakResponse/);
  assert.match(page, /source\.playbackRate\.value/);
  assert.match(page, /female-clear/);
  assert.match(css, /coach-voice-wave/);
});

test("coach help, contextual goals and Hebrew trend units stay explicit", () => {
  assert.match(page, /coachHelpQuestions/);
  assert.match(page, /coach-help-panel/);
  assert.match(page, /הקרא תשובה/);
  assert.match(page, /calmChallengePool/);
  assert.match(page, /מותאמים לשעה, לפערים ולשלב שלך בתהליך/);
  assert.match(page, /cups > 1/);
  assert.match(page, /מתוך 30 ימים/);
  assert.match(page, /monthlyAverageProtein\} גרם/);
  assert.match(css, /metric-protein/);
});

test("insights waits for stable data before revealing animated charts", () => {
  assert.match(page, /setInsightsData\(null\);[\s\S]{0,80}setInsightsOpen\(true\)/);
  assert.match(page, /insights-modal \$\{!insightsData \? "loading" : ""\}/);
  assert.match(page, /insights-loading/);
  assert.match(css, /insights-modal\.loading>\.goal-plan-card/);
  assert.match(css, /insights-loading-spin/);
});

test("balanced meal opens its full preview and mobile navigation is icon-led", () => {
  assert.match(page, /topMealDetails/);
  assert.match(page, /openTopMealPreview/);
  assert.match(page, /setMealPreviewReturnToInsights\(true\)/);
  assert.match(page, /setInsightsOpen\(false\)/);
  assert.match(page, /חזרה למגמות/);
  assert.match(page, /length > 42/);
  assert.match(page, /className="nav-label"/);
  assert.match(page, /aria-label="מגמות"/);
  assert.match(css, /bottom-nav \.nav-label/);
  assert.match(css, /width:29px;height:29px/);
});

test("desktop destinations use a full system-screen shell without visible scrollbars", () => {
  assert.match(expansionCss, /@media\(min-width:761px\)/);
  assert.match(expansionCss, /height:calc\(100dvh - 48px\)/);
  assert.match(expansionCss, /settings-modal:not\(\.compact-modal\):not\(\.quick-confirm\):not\(\.overage-modal\)/);
  assert.match(expansionCss, /scrollbar-width:none/);
  assert.match(expansionCss, /coach-sheet\{position:relative/);
});

test("meal review keeps final actions in document flow and uses a toggle star", () => {
  assert.match(page, /meal-favorite-star/);
  assert.match(page, /aria-pressed=\{draftAlreadyFavorite\}/);
  assert.match(page, /name="star"/);
  assert.match(page, /estimatedCalorieRange/);
  assert.match(expansionCss, /meal-modal>footer\{position:static!important/);
  assert.match(expansionCss, /meal-favorite-star\.selected \.app-icon\{fill:currentColor/);
});

test("favorite selection persists across historic days and offline sync", () => {
  assert.match(favoritesRoute, /\[data\.today, \.\.\.\(data\.history \|\| \[\]\)\]/);
  assert.match(favoritesRoute, /body\.meal && typeof body\.meal === "object"/);
  assert.match(page, /queueMutation\("\/api\/favorites"/);
  assert.match(page, /נשמרה גם במועדפים ★/);
  assert.match(page, /async function toggleDraftFavorite/);
  assert.match(page, /שמירה מיידית במועדפים/);
  assert.match(page, /נשמר במועדפים ✓/);
  assert.match(favoritesRoute, /item\.meal\?\.name !== String\(name \|\| ""\)\.trim\(\)/);
});
