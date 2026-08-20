# Changelog

## 1.0.2

- Fixed category and food images under Home Assistant Ingress by resolving assets relative to the active Ingress path.
- Made voice analysis faster by reusing a valid browser transcript instead of transcribing the audio twice, with visible elapsed processing time and phases.
- Added AI timeouts, one safe retry for transient provider failures, low-latency Gemini thinking and useful provider-specific errors instead of generic 502 responses.
- Added date and time selection when logging a forgotten meal and automatic chronological placement in the correct daily timeline.

## 1.0.1

- Reused the proven PROJECTS voice-recording pattern: browser-native MediaRecorder and multipart audio upload.
- Added Hebrew browser speech recognition as a resilient transcript fallback when provider audio decoding fails.
- Improved mobile microphone errors, minimum recording validation and support for WebM, MP4/M4A and Ogg audio.

## 1.0.0

- Added official Home Assistant `icon.png` and `logo.png` assets based on the approved CALOREAZI symbol.
- Added a category-native three-step flow: type a fruit, vegetable or drink name, let AI create its image and nutrition estimate, then save or cancel.
- Added persistent meal photos, real daily score and tracking streak instead of placeholder values.
- Completed Admin backup creation, verified download, safety restore and audit-log views.
- Added Ingress-safe PWA paths, service-worker shell caching and clear offline state handling.
- Expanded audit coverage for users, passwords and AI configuration.

## 0.9.0

- Added persistent, profile-aware AI coach memory with weight goals, measurements, meals, trends, activity and learned meal corrections.
- Prevented repeated greetings and instructed the coach to avoid irrelevant, repetitive hydration reminders.
- Added activity tracking, weekly/monthly insights, meal scores, soft-delete trash, personal export, audit log and backup APIs.
- Improved voice recording compatibility and contextual creation of custom fruit, vegetable and drink catalog items.
- Moved display preferences into the user profile and improved responsive navigation and gallery styling.

## 0.8.3

- אייקון PWA ודפדפן חדש המבוסס על הסמל המקורי מתוך הלוגו המאושר, ללא שם המותג וללא ציור מחדש.

## 0.8.2

- אייקון הדפדפן וה־PWA מציגים את הלוגו המלא והמקורי של CALOREAZI.
- ניהול השיתוף הועבר מהסרגל הראשי אל הגדרות המשתמש.

## 0.8.1

- תיקון favicon ואייקון PWA כך שישתמשו בסמל המותג המאושר ובצבעיו המדויקים.
- אייקוני PNG ייעודיים לדפדפן, למסך הבית ול־maskable ללא חיתוך או עיוות.

## 0.8.0

- אריח צילום מאוחד עם בחירה בין מצלמה לגלריה; קיצור המצלמה התחתון נשאר ישיר.
- חישוב AI לתיאור ארוחה ידני, עם פירוט ועריכה לפני אישור.
- גלריית פירות, ירקות ומשקאות מצולמת, עם אישור וסוג ארוחה לפני הוספה.
- הוספת פריט קבוע מותאם עם קטגוריה, תמונה או יצירת תמונת AI חסכונית.
- בסיס טפסים יציב לנייד שמונע zoom ושינויי גודל בזמן הקלדה.
- זיהוי תמונה מחמיר יותר: ספירת חתיכות, הפרדת סוגי מזון, כיול אישי וחלופות כשאין ודאות.

## 0.7.0

- הוספת ארוחה בקול: הקלטה, תמלול AI, פירוק לפריטים, עריכה ואישור לפני שמירה.
- שימוש חוזר בתמונה קיימת מתאימה לפני יצירת תמונת AI חדשה.
- שותף מעקב בהזמנה ואישור, עם הרשאות נפרדות לסיכום יומי, ארוחות ומשקל.

- ניתוח תמונה מפורק לרכיבי ארוחה עם משקל, כמות וערכים ל־100 גרם.
- עריכת פריטים והוספת שדה מותאם לפני חישוב ושמירה.
- חישוב קלוריות ומאקרו רק לאחר אישור המשתמש.
- שמירת תיקוני כמויות ככיול אישי לניתוחי AI עתידיים.
- מסלול נפרד לצילום ומסלול לטעינת תמונה מהגלריה או מהמחשב.
- הוספת ארוחה ידנית חופשית, כולל אפשרות לחישוב לפי רכיבים ומשקל.
- ספריית מאכלים אישית ומשותפת עם תמונה מצולמת או תמונה שנוצרת באמצעות AI.
- הפרדת ארוחות לבוקר, צהריים, ערב ובין הארוחות.
- היסטוריה יומית לפי שעה עם סיכום קלוריות, מאקרו ושתייה.

## 0.6.0

- ברכה דינמית לפי השעה המקומית של המשתמש.
- פרופיל לחיץ עם תמונה, פרטים אישיים, משקל, יעד ועריכת נתונים.
- החלפת משתמש ויציאה מתוך הפרופיל.
- אריחי צילום והוספה ידנית נגישים וברורים במסך הראשי.
- תובנות יומיות לפי קלוריות, חלבון ושתייה במקום אריח המשקל הנפרד.
- הסתרת שם ספק ומודל ה-AI מחוויית המשתמש הרגילה.
- הסרת כפתור הניהול הכפול מהסרגל העליון.

## 0.5.0

- Remembers signed-in users for 30 days with a persistent add-on session secret.
- Adds daily history foundations, weight measurements and trend feedback.
- Adds favorite meals and one-tap repeat logging.
- Adds a visual quick-add flow for vegetables, fruit, and drinks with editable portions.
- Adds Admin health, AI feature usage, last-login visibility, and user disable/enable controls.

## 0.4.0

- Adds AI meal-photo analysis with camera/gallery capture and editable nutrition estimates.
- Adds a curated model catalog with recommendations, descriptions, vision support, and estimated token pricing.
- Adds secure Admin password rotation and invalidates older sessions.
- Keeps the approved full-color logo in both light and granite dark themes.

## 0.3.1

- Fixed the unauthenticated startup screen crashing before Login or Admin setup could render.
- Made dashboard-derived calculations safe while the session state is still incomplete.

## 0.3.0

- Added password-based login and signed sessions for every CALOREAZI account.
- Added a protected Admin Center with global AI/token configuration and user creation.
- Added isolated profile, onboarding, meal, water, and AI usage data per user.
- Added automatic migration of the existing owner and nutrition data into the Admin account.
- Added transparent Mifflin–St Jeor calorie targets with BMI, maintenance calories, goal adjustment, expected pace, and safety floors.
- Updated the default Gemini model for new configurations to `gemini-3.6-flash`.
- Allowed non-admin Home Assistant users to open CALOREAZI and authenticate with their own account.

## 0.2.1

- Fixed client API requests so they retain the Home Assistant Ingress base path.
- Added safe handling for malformed or non-JSON server responses.
- Re-enabled standalone LAN access on port `8686` by default.

## 0.2.0

- Added a five-step progressive onboarding flow and first-value personalized targets.
- Added persistent owner profile, daily water, meals, calories, and macros under Home Assistant `/data`.
- Added manual meal creation and deletion with live daily totals.
- Added encrypted OpenAI and Gemini provider settings, model selection, connection testing, and provider abstraction.
- Added a context-aware AI Coach with token usage, estimated cost, monthly budget, soft warning, and hard limit foundations.
- Added a focused Admin AI settings experience and usage summary.
- Added a granite dark theme logo treatment that preserves the orange/amber mark and `CAL` / `OR` / `EAZI` hierarchy.
- Added provider adapter tests and production API routes for onboarding, state, water, meals, AI settings, and chat.

## 0.1.3

- Replaced the nested SVG logo with the approved self-contained transparent PNG.
- Verified the logo inside the full production interface before release.

## 0.1.2

- Fixed the approved logo asset resolving outside the Home Assistant Ingress path.

## 0.1.1

- Fixed Home Assistant Ingress entry URL generation that produced a double slash.
- Aligned the Ingress listener with Home Assistant's Supervisor-only access guidance.
- Removed a duplicate Nginx MIME directive warning and enabled streaming support.

## 0.1.0

- First installable Home Assistant add-on preview.
- Responsive Hebrew nutrition dashboard with light and granite-dark themes.
- Approved CALOREAZI identity with graduated `CAL` / `OR` / `EAZI` typography.
- Initial AI token usage, cost estimation, and budget-control foundation.
- Home Assistant Ingress, standalone Web UI, watchdog, and health endpoint.
