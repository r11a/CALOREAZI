# Changelog

## 1.18.27

- שם ארוך באריח הארוחה המאוזנת מתקצר לשתי שורות בלי לשנות את שם הארוחה השמור.
- לחיצה על הארוחה המאוזנת פותחת את חלון פרטי הארוחה המלא עם תמונה, ערכים ורכיבים.
- הסרגל התחתון עבר לתצוגת אייקונים מוגדלים ללא מלל חזותי, תוך שמירת שמות נגישים לקוראי מסך.

## 1.18.26

- מסך המגמות מאפס נתונים ישנים לפני כל פתיחה ואינו מציג עוד לרגע את גרף המשקל לבדו.
- נוסף מצב טעינה יציב ונעים עד שנתוני המגמות והגרפים מוכנים יחד.
- אנימציות הגרפים מתחילות רק לאחר השלמת הטעינה, ללא קפיצה בפריסה.

## 1.18.25

- ירקות בתוך כריך, טוסט, פיתה או לאפה נספרים כמנת ירקות אחת של 70 גרם, גם אם זיהוי התמונה העריך משקלים גדולים לרכיבים.
- אמינות מקור המזון מאמתת מעתה את זהות הירק או הפרי בלבד ולא מעניקה אמינות אוטומטית למשקל שהוערך בצילום.
- מספר ירקות בתוך אותה ארוחה מורכבת אינם מצטברים בטעות לכמה מאות גרמים.

## 1.18.24

- ארוחה מורכבת כמו כריך או טוסט אינה יכולה עוד להיספר כולה כמשקל ירקות ופירות.
- משקל מדויק ממקור תזונתי מאומת מקבל עדיפות, בעוד סיווג משוער מוגבל למנת ירק או פרי סבירה.
- נוספו תקרות הגנה לרכיב ולארוחה כדי למנוע ניפוח של מדד הירקות והפירות.

## 1.18.23

- מנוע הציון מזהה ירקות ופירות בכל דרך הזנה: קטלוג, צילום, קול, טקסט, מועדפים וארוחות ישנות.
- משקל רכיב שמור מקבל עדיפות; כשאין פירוט משקל מופעל אומדן מנה שמרני לפי שם המזון או הארוחה.
- ארוחות קיימות מחושבות מחדש אוטומטית, בלי צורך למחוק ולהוסיף אותן שוב.

## 1.18.22

- שאלות מוכנות הועברו מתצוגת הצ׳אט לתפריט מידע מסודר, עם שאלות למאמן ועזרה בשימוש באפליקציה.
- לכל תשובת מאמן מוצגת פעולת הקראה, גם כאשר השאלה נשלחה כטקסט.
- היעדים הרגועים במסך הבית נגזרים מפערי היום, השעה והשלב בתהליך ומתחלפים לאורך היום.
- תמונת 30 הימים משתמשת ביחידות עבריות ובצבעים מובחנים לכל מדד.
- גרף שעות השתייה מציג מספר כוסות בתוך העמודה כאשר נרשמה יותר מכוס אחת.

## 1.18.21

- שמות המאמנים עודכנו ל־Cal ול־Eazi בכל התצוגות, הפרופיל והנחיות הצ׳אט.
- בחירות קיימות שנשמרו בעבר כ־CAL או EZI מנורמלות אוטומטית בלי לאבד את העדפת המשתמש.

## 1.18.20

- גרף המשקל מציג תווית גדולה וברורה לכל נקודת שקילה, עם ניגודיות וגובה מותאמים לטלפון.
- המלצות המאמן מתחשבות כעת בשעה, בקצב ההתקדמות היומי, בארוחה הבאה, בפערי התזונה, בשלב המסלול ובמגמת המשקל.
- עצות מים וחלבון מופיעות רק כשהמשתמש מפגר ביחס לשעה ביום, ולא רק משום שהיעד היומי עדיין לא הושלם.
- ניסוח ההמלצות מתחלף לאורך היום, בעוד העדיפות נקבעת לפי הנתונים ולא באופן אקראי.

## 1.18.19

- כל ממשק CALOREAZI עבר לגופן Heebo מקומי, כולל טפסים, כפתורים, מודלים, צ׳אט וגרפים — גם במצב Offline.
- נוספה היררכיית משקלים עקבית לטקסט, כותרות, תוויות ומספרים במקום שימוש גורף ב־Bold.
- הקריאות בטלפון הותאמה לעקרונות Apple HIG: טקסט גוף 16px, טקסט משני קריא ויעדי לחיצה בגובה 44px לפחות.

## 1.18.18

- תצוגת 30 יום נבנתה מחדש כגרף שטח וקו עצמאי, קריא ומונפש שאינו מושפע מסגנונות האריחים.
- חלון המגמות קיבל גלילה ושכבת תצוגה יציבות במחשב ובטלפון, והגרף המרכזי עבר לראש היררכיית התוכן.
- נוספו קווי עזר, נקודות נתונים, תאריכי התחלה וסיום והתאמה מלאה לממשק כהה ובהיר.

## 1.18.17

- תיקון מבני למסך המגמות: ביטול התנגשות בין סגנונות האריחים לעמודות הגרף וסדר תוכן חדש וברור.
- גרפים חיים למשקל, מים, סוכר וציון 30 יום, עם אנימציית כניסה וניגודיות מותאמת למצב כהה ובהיר.
- המלצת הזהב מתחלפת אוטומטית בכל שלוש שעות לפי הפערים העדכניים של המשתמש.
- אווטארים מצולמים ייעודיים למאמן ולמאמנת במקום אייקון גנרי בצ׳אט.

## 1.18.16

- זהות אישית למאמן: בחירת CAL או EZI, מאמן או מאמנת ולשון הפנייה למשתמש.
- צ׳אט קריא עם אווטאר לכל הודעה, בועות תכלת וכתום ופונטים מוגדלים בנייד.
- מסך מגמות מחודש עם גרף 30 יום מונפש, היררכיית מידע ברורה וכרטיסים מותאמים למצב כהה ובהיר.
- עיגול קלוריות עקבי בעת שמירת ארוחה: 0.5 ומעלה כלפי מעלה ומתחת לכך כלפי מטה.

## 1.18.15

- מצב יום אישי לעובדי משמרות: בחירה בין איפוס בחצות לבין סיום ידני בפרופיל.
- כפתור „סיים יום” באריח הקלוריות עם סיכום ואישור לפני העברה להיסטוריה.
- ארוחות, מים ופעילות אחרי חצות ממשיכים להשתייך ליום הפעיל במצב ידני.
- שמירת היום הפעיל במסד הנתונים ובאתחול מחדש, עם מניעת ימים חופפים.

## 1.18.14

- מצב שיחה קולית מהיר: תשובת המאמן מוגבלת לשני משפטים קצרים והקשר נשלח בפורמט קומפקטי.
- הקראה מהירה וטבעית יותר בקצב מותאם, בענן ובקול המכשיר.
- ארבע בחירות קול בפרופיל: גברי/נשי בסגנון חם או ברור, הנשמרות לכל משתמש.

## 1.18.13

- מניעת כמה תשובות קוליות מקבילות באמצעות ביטול בקשות ישנות ונעילת שליחה כפולה.
- ביטול מעבר אוטומטי בין קול ענן לקול המכשיר; הספק שנבחר בפרופיל הוא היחיד שמושמע.
- חיווי נפרד להכנת הקול, עצירה שמבטלת גם תשובה ממתינה וניקוי מלא בסגירת המאמן.

## 1.18.12

- פתיחת ערוץ האודיו בזמן פעולת המשתמש כדי לאפשר תשובת מאמן קולית ב־iPhone PWA.
- ניגון תשובת הענן דרך Web Audio עם fallback לנגן הדפדפן ולקול המכשיר.
- חיווי "המאמן עונה בקול" מוצג רק לאחר שההשמעה התחילה בפועל.

## 1.18.11

- Moved the cloud/device provider and male/female coach voice choices into the user profile.
- Simplified mobile coach UI to one clear microphone: tap to listen, tap again to send; voice messages receive spoken answers while typed messages remain text-only.
- Replaced the Gemini speech call with the stable TTS generate-content path and added server transcription fallback when iPhone PWA browser dictation is unavailable.
- Reduced mobile chat clutter to three focused prompts and added explicit listening, transcription, thinking and speaking states.

## 1.18.10

- Made coach voice a one-tap flow: tap, speak naturally, pause to send automatically, and receive the reply aloud in the selected voice.
- Added clear listening, thinking and speaking feedback, faster speech-end detection and safe interruption of previous playback.

## 1.18.9

- Reworked coach replies into concise, patient and constructive Hebrew that leads with one useful insight instead of dumping every available metric.
- Added a persistent male or female coach-voice preference with high-quality Gemini or OpenAI cloud speech and a safe Hebrew device fallback.
- Removed token and cost diagnostics from the user conversation and refined the coach welcome, status and voice controls.

## 1.18.8

- Added a voice-first coach conversation: one-tap Hebrew dictation sends automatically, replies can be read aloud, auto-speech is optional, and listening or playback can be stopped clearly.

## 1.18.7

- Replaced clipped mobile ADMIN tabs with one clear, full-width section selector grouped by system and maintenance tasks.

## 1.18.6

- Moved ADMIN management out of the user profile and into a subtle settings icon beside the administrator avatar.
- Rebuilt ADMIN as a focused control center with desktop side navigation, mobile task tabs, clear section hierarchy and one relevant workspace at a time.

## 1.18.5

- Unified desktop overlays into large system-style screens with sticky headers and footers, consistent spacing and hidden scrollbars.
- Expanded the desktop coach into the same centered system-screen language while keeping confirmations and password prompts compact.

## 1.18.4

- Fixed history deletion for legacy water entries that do not have a stored identifier, while removing only the selected event.
- Replaced the browser password prompt for historic meal deletion with a masked in-app password form.
- Added integration coverage proving that historic water and password-protected meal deletion persist after a database round trip.
- Added a permanent Trends destination to the balanced five-item bottom navigation, and moved ADMIN management into the profile Account tab.

## 1.18.3

- Water entries can now be deleted directly from history without a password after an explicit confirmation, while meal deletion remains password protected.
- Replaced profile-tab emoji thumbnails with the product's consistent vector icon language and improved mobile spacing, active states and tap targets.

## 1.18.2

- Fixed local-midnight rollover even when the previous day was empty, and assigned meals and water using each user's timezone.
- Added duplicate-tap protection and idempotent feedback for water updates.
- Added password-protected meal and water deletion from history with immediate score and metric recalculation.
- Added a start-to-target weight progress axis and RTL-aligned trend bars.
- Added favorite editing, manual nutrition values and AI recalculation.
- Added per-user Hebrew/English language preference and onboarding language selection; English remains explicitly marked beta.
- Improved dark onboarding controls, chat readability and the coach panel visual hierarchy.
- Added optional experimental camera portion calibration using a plate or standard-card reference and learned corrections.

## 1.18.1

- Added a clear onboarding and reusable “My path” wizard that records where the user joined the process, prior duration and progress, earlier approach, current obstacle, training experience and preferred pace.
- Users who join mid-process receive relevant follow-up questions while self-reported history remains explicitly separated from measured application data.

## 1.18.0

- Added goal modes for cutting, maintenance, lean mass gain, performance and balanced living.
- Added a conservative adaptive goal engine based on weight trend, logging consistency, minimum data requirements and a 14-day cooldown.
- Added a transparent “My path” trends card with calibration quality, desired versus observed pace and an approval-only 100 kcal adjustment proposal.
- Added a fast workout entry flow with workout type, duration controls and intensity; optional details stay collapsed.
- Specialized the coach for cutting and muscle-gain tracking using a curated ACSM, IOC and ISSN evidence policy, without allowing the model to invent numeric targets or citations.

## 1.17.0

- המאמן בודק את מצב היום במספר נקודות זמן ושולח המלצה אישית לפי הפער החשוב בפועל, תוך כיבוד שעות שקטות ומגבלת ההודעות.
- נוספו סיכומי ביניים ב־12:00, 16:00 ו־20:00 עם קלוריות עד כה והצעד התזונתי הבא.
- תוכן ההתראות מגוון כעת בין חלבון, סיבים, ירקות ופירות, מים, קלוריות ותיעוד — ולא חוזר אוטומטית על שתייה.
- אריח המלצות המאמן מתעדכן לפי נתוני היום והשעה ומסביר פערים בסיבים ובירקות ופירות.
- מאגר „מה כדאי לאכול עכשיו” הורחב, משתנה בין ימים, וכפתור הרענון מעביר לקבוצת הצעות חדשה.
- פירוט הציון מסביר מדוע כל רכיב נמוך ומה הפעולה המעשית לשיפור איכות התזונה.
- ציוני ההיסטוריה מחושבים אוטומטית במנוע 2.0 והפירוט מוצג ישירות ללא כפתור המרה או פתיחה.

## 1.16.0

- נוסף מרכז סנכרון המציג חיבור, פעולות ממתינות, זמן ההזנה וכשלים הדורשים טיפול.
- נוספו ניסיון חוזר ידני וסנכרון יזום, לצד משוב ברור למצבי Offline, סנכרון והצלחה.
- כשל מוצג למשתמש רק לאחר שלושה ניסיונות, בלי להציף אותו בתקלות רשת רגעיות.
- זמן ותאריך ההזנה המקוריים נשמרים למים ולפעילות גם כשהסנכרון מתבצע ביום אחר.
- צילומי Offline נדחסים חזק יותר ומפונים אוטומטית מהאחסון המקומי לאחר ניתוח מוצלח.
- התור ממשיך לפעול לפי סדר ההזנה ומגן על מים, פעילות וארוחות מפני יצירה כפולה.
- עריכת אותה ארוחה משני מכשירים מזוהה כהתנגשות במקום לדרוס בשקט את השינוי החדש יותר.

## 1.15.1

- נוסף Offline Outbox עמיד עבור ארוחות, מים, משקל, פעילות ושינויי פרופיל שאינם רגישים.
- הזנות Offline מוצגות מיד עם סימון המתנה ומסתנכרנות לפי הסדר בחזרת הרשת, בחזרה לאפליקציה ובניסיון מחזורי.
- נוספה הגנת idempotency למים ולפעילות כדי למנוע כפילויות בניסיון סנכרון חוזר.
- צילום Offline נשמר מקומית, מנותח בחזרת החיבור ונפתח לבדיקה ולאישור רק כשהתוצאה מוכנה.
- שינויי אימייל, סיסמה ומשקל התחלתי ממשיכים לדרוש חיבור מאובטח ואינם נשמרים בתור המקומי.
- ליד תאריך הלידה מוצג כעת הגיל המחושב המדויק באונבורדינג ובפרופיל.

## 1.15.0

- נוסף מנוע ציון יומי 2.0 המפריד בין איכות תזונתית, התאמה ליעדים והרגלים.
- הציון מציג כיסוי נתונים ואינו מעניש על מדד שלא תועד או לא זמין במקור התזונתי.
- לחיצה על בר הציון מציגה ציוני רכיבים, מדדי משנה והמלצה ממוקדת לשיפור.
- כל יום שמור בהיסטוריה מנותח מחדש לפי המנוע החדש וכולל פירוט חזותי נפתח.
- תאריך לידה מחליף הזנת גיל באונבורדינג ובפרופיל; הגיל נגזר אוטומטית לצורך חישוב היעדים.
- הורחבו נתוני הקטלוג התזונתי האופציונליים לסיבים, נתרן ושומן רווי ממקור USDA.

## 1.14.0

- שמירת ארוחה חדשה ב-PostgreSQL מתבצעת כעת בטרנזקציה ממוקדת במקום בנייה מחדש של מצב המערכת.
- מזהה בקשה ייחודי מונע ארוחות כפולות בלחיצה חוזרת או בניסיון שמירה חוזר.
- תמונות ארוחה נשמרות כ-WebP קל עד 512px, ללא שמירת קובץ המקור הכבד.
- קלט תמונה של עבודת AI מוסר לאחר השלמה או כישלון סופי כדי למנוע ניפוח של מסד הנתונים.
- נוספה תשתית benchmark למדידת דיוק קלורי, זיהוי רכיבים, תיקונים וזמני תגובה.

## 1.13.9

- Unified every meal-source action in the primary add menu with a white line icon, orange gradient background and subtle glow.
- Kept the existing vegetable, fruit and drink category artwork and colors unchanged.

## 1.13.8

- Fixed legacy sharing candidates so an old email stored as a username is never shown; sharing now uses the current user name and internal user ID only.
- Added a prominent “Nice to meet you” button under Account that opens a separate, optional and mobile-friendly questionnaire.
- Expanded the questionnaire with practical schedule, meal-pattern, cooking, budget, hunger, digestion, emotional-eating and coaching-style choices plus focused free-text fields.
- Added the optional questionnaire context to the AI coach so saved answers affect recommendations and communication style.
- Removed the application-name fallback from Push notification titles; every app-generated notification now uses a concise subject title.
- Prevented the phone keyboard from opening automatically when entering the shared or manual meal-add flow.

## 1.13.7

- Made the home greeting plus button identical in behavior and visual language to the plus button in “What I ate today”.
- Moved “photograph meal” into the shared primary add menu alongside food search, categories, barcode, voice and manual entry.
- Placed “calculate values” and “I have values” side by side in manual entry with clear icons and mobile-friendly tap targets.

## 1.13.6

- Added a prominent manual-add button opposite the personalized greeting on the home screen.
- Added a “photograph meal” action inside manual entry that reuses the same phone capture/gallery flow as the main navigation camera.

## 1.13.5

- Automatically completes missing per-item calories after photo recognition and calculates the actual calories for the detected weight and quantity.
- Added a persistent AI recalculation action that uses the user's edited item names, weights and quantities.
- Fixed history timeline meal pictures and icons so they open the full meal view and return to history when closed.
- Moved mobile Toast messages above the persistent navigation bar with readable wrapping and safe-area spacing.

## 1.13.4

- Personalized every Push notification with the user's first name and rotating concise wording without an application-name title.
- Added a dedicated “send test” action beside every notification type with visible delivery feedback.

## 1.13.3

- Fixed the mobile profile tabs so their icons and labels keep their full height and remain horizontally scrollable on narrow iPhone screens.
- Expanded the configurable daily notification ceiling to 5, 10, 15 or 20 notifications.
- Added an optional daily 07:30 morning notification with yesterday's score and calories plus today's calorie target.

## 1.13.2

- Added a dedicated notification tab to the user profile with an individual checkbox for meal, water, daily-summary, insight, coach, weekly-trend, weight and calm-achievement notifications.
- Added editable meal, water, coach and daily-summary times, a daily notification limit and absolute quiet hours that work across midnight.
- Added a server-side smart scheduler that evaluates actual user data, timezone and relevance before sending background Push notifications.
- Added visible step-by-step feedback when enabling lock-screen notifications, including actionable iPhone and service-worker errors.
- Automatically renews stale Push subscriptions when the server key changes and removes expired Apple Push endpoints.
- Added scheduler tests for quiet hours, delivery windows and bounded notification settings.

## 1.13.1

- Added standards-based Web Push subscriptions for installed iPhone PWAs.
- Added encrypted server-side VAPID key storage and per-user device subscriptions.
- Added background notification display and notification-click handling in the service worker.
- Replaced the foreground-only permission check with a server-delivered lock-screen test notification.
- Added clear iPhone guidance when CALOREAZI is opened in Safari instead of from its Home Screen icon.
- Made both meal photos and generic meal icons in the history timeline open a detailed meal view above the history screen.

## 1.13.0

- Added internal sharing invitations by username with persistent accept/reject actions, independent daily-data, meal, weight and trend permissions, and revocation at any time.
- Added the optional “נעים להכיר” profile, new-goal cycles that preserve prior history, AI-assisted activity entry and calm personal challenges.
- Added water events to the history timeline, meal-image previews, water-by-hour insights and opt-in PWA notifications.
- Added reversible calorie-overage handling so the triggering meal can be reviewed, edited or removed.
- Added secure admin controls to update a user's email and/or reset their password, with validation, audit records and active-session revocation.

## 1.12.0

- Combined the planned 1.13 and 1.14 meal-history scope into release 1.12.0.
- Added a dedicated “שכחתי לעדכן” flow to manual meal entry.
- Supports several meals in one session, each with its own description, day, time and meal period.
- AI calculates every meal before saving and exposes editable ingredient quantities and gram weights.
- A final confirmation saves every prepared meal into the correct day and chronological timeline, then refreshes daily totals and history.
- Added a focused edge-to-edge mobile layout with large quantity controls and clear calculation/save feedback.

## 1.11.0

- Combined the planned 1.11 and 1.12 rounds into one account, onboarding and coaching release.
- Added editable email and password controls for regular users with current-password verification and session revocation after password changes.
- Added workout-type selection and clear nutrition-style choices with concise explanations in onboarding and the personal profile.
- Added an in-profile explanation of the automatic calorie target while preserving the existing safe manual target mode.
- Replaced the inaccessible Admin item for regular users with a direct Insights navigation item.
- Coach requests to add food now prepare an AI-calculated meal draft and always require explicit review and confirmation before saving.
- Improved dark onboarding contrast, mobile barcode viewport behavior and 15-second orange success notifications.

## 1.10.1

- Photo capture now opens directly into an animated recognition state instead of briefly showing manual-entry controls.
- Replaced the dense photo review with a large image, clear detected meal name, calories and a five-star confidence indicator.
- Detailed fields, AI correction and library options stay hidden unless the user opens “יש טעות? ערוך”.
- Unreadable photos stop before AI analysis and offer one prominent “צלם שוב” action.
- Removed duplicated photo, technical guidance and small status text from the default review.

## 1.10.0

- Redesigned meal capture as a calm, unified review screen for photo, voice, barcode and manual entry.
- Kept the essential meal summary visible while moving detailed nutrition fields into an optional advanced editor.
- Added large `+` and `−` controls for portions, weights, calories and macronutrients alongside exact numeric entry.
- Added a clear capture → review → confirm progress indicator and one prominent confirmation action.
- Reused the already-decoded photo, reduced upload payload and shortened polling intervals for faster recognition.
- Automatically suggests the meal period by local time and no longer adds voice meals to favorites by default.
- Preserved field-level validation, AI correction, duplicate-submit protection and database persistence verification.

## 1.9.2

- Fixed an initial-render crash caused by reading streak data before application state finished loading.
- Release CI now downloads a real frontend asset before and after an add-on restart.

## 1.9.1

- Unified photo, voice and manual meal capture around one editable review-and-confirm flow.
- Added focused “Fix with AI” corrections that update the current draft without saving it automatically.
- Reduced meal-photo upload size and shortened result polling for faster perceived recognition.
- Added calm consistency badges that reward progress without punishing broken streaks.

## 1.9.0

- הורחבו בדיקות שמירת הארוחות ליצירה, עריכה, חישוב יומי ושמירה בתאריך היסטורי.
- נוסף שער TypeScript ופקודת אימות מלאה לפני שחרור.
- נוספו חוזי מובייל למצלמה, גלריה, ברקוד, קול, Safe Area וניווט PWA.
- רכיב האייקונים ובקרות התזונה הופרדו מהמסך הראשי למודולים עצמאיים.
- מאגר המזון קיבל מטמון מהיר, מקורות, ציון אמינות ומוצרים נפוצים נוספים בעברית.
- נוספה בקרת היגיון לקלוריות, מאקרו, משקאות ומנות חריגות מתמונה או קול.
- `sharp` שודרג והוסר ממצא האבטחה בדרגת High; צינור WebP מכוסה בבדיקה.
- לוג ADMIN כולל כשלי AI ומדיה ממתינה ומוצג רק בטאב הלוגים.
- נוסף CI להתקנה קרה של תוסף Home Assistant, PostgreSQL ו־Restart עם אחסון קבוע.
- מסך המגמות מציג תמונת 30 ימים והשוואה לשבוע הקודם ולמשקל ההתחלתי.
- פירוט המאכלים בלחיצה על חלבון, פחמימות או שומן ממוין לפי הכמות מהגבוה לנמוך.

## 1.8.3

- בעריכת ארוחה מוצג כפתור ראשי וברור „שמור שינויים וסגור”.
- השמירה מעדכנת את הארוחה הקיימת, נסגרת רק לאחר הצלחה ונשארת פתוחה עם משוב במקרה של שגיאה.
- בנייד פעולת השמירה בעריכה מוצגת ברוחב מלא ואינה נדחקת בין פעולות הביטול והמחיקה.

## 1.8.2

- כפתורי שמירת הפרופיל חזרו לתחתית הטופס ואינם מכסים שדות בנייד.
- שינוי משקל התחלתי מחייב אימות סיסמה; מדידות חדשות אינן משנות את נקודת הייחוס.
- כפתור ניקוי הברקוד מיושר בתוך שדה ההזנה.
- נוספה הכתבה קולית בצ׳אט וניקוי תצוגה מתמשך ששומר את זיכרון המאמן.
- סל המחזור עבר לטאב ADMIN רגיל והגישה אליו מוגנת בשרת למנהלים בלבד.

## 1.8.1

- סריקת ברקוד חיה באייפון ובדפדפנים נתמכים, ללא שמירת תמונות, עם ניקוי מהיר להזנה ידנית.
- עיצוב מחודש למסך המועדפים עם הוספה מאושרת ומהירה לארוחה.
- חלוקת הפרטים האישיים לטאבים ברורים ומותאמים לנייד, כולל משקל התחלתי קבוע ומשקל נוכחי נפרד.
- ששת אריחי הסיכום במסך מגמות קיבלו צבע, היררכיה ומצבי הצלחה או תשומת לב.
- אריחי תקינות המערכת במרכז הניהול מופיעים רק בטאב ה־AI הרלוונטי.
- שיתוף עם כמה משתמשים קיימים מתוך רשימת שמות בלבד, וכניסה באמצעות אימייל או שם משתמש חד־משמעי.

## 1.8.0

- משקל הרישום נשמר כנקודת ייחוס קבועה ונפרדת מהמשקל הנוכחי; מדידה ראשונה מושווית אליו וכל מדידה נוספת נשמרת בהיסטוריה.
- כל ארוחה עוברת למסך סיכום קלוריות ומאקרו לפני אישור השמירה, ושינוי לאחר הסיכום מחייב סקירה חוזרת.
- בכותרת ״מה אכלת היום״ נוספו כפתורי מצלמה ישירה והוספה ידנית נפרדים.
- ספריית המשתמש הוגדרה כמועדפים: הוספה ידנית אינה נשמרת בקטלוג כברירת מחדל והסרת מועדף אינה מוחקת מהקטלוג.
- ממוצעי המגמות מציגים מצב צבעוני וברור מול היעד: דורש שיפור, מתקרב, בטווח או מעל הטווח.
- תוקנו המרווחים בין אריחי דף הבית וכפתורי דף הפרטים האישיים הותאמו למובייל ללא חריגה או צפיפות.
- ייצוא הנתונים ומחיקת החשבון מוצגים כפעולות ברורות ונפרדות; מחיקה דורשת סיסמה ושני שלבי אישור וגם מאומתת בשרת.
- חיפוש האוכל מחובר קודם למאגר התזונה הלאומי בעברית של משרד הבריאות, עם השלמה ממוצרים בעלי שם עברי ב־Open Food Facts; אפשר לבחור מוצר, להזין משקל ולראות חישוב יחסי לפני הוספה.
- נוספה סריקת ברקוד מהמצלמה והזנה ידנית של הקוד; מוצר מזוהה מוצג עם מקור, משקל וחישוב, ו־AI משלים ערכים חסרים לפני האישור.
- הוספת ארוחה ידנית קוצרה: אפשר לתאר או להכתיב ל־AI, או להזין שם, כמות וערכים ישירות, לראות סיכום חי ולהוסיף בכפתור יחיד.

## 1.7.9

- סל המחזור כולל חזרה למרכז הניהול וריקון מלא עם אזהרת מחיקה שאינה ניתנת לשחזור.
- נוסף אריח מגמות דינמי עם ציון היום ושינוי המשקל מול המדידה הקודמת.
- אריח המלצות המאמן מציג עד שלוש המלצות שונות והוסר ממנו כפתור המגמות הכפול.
- המלצות הארוחה נשארות סגורות ונקיות עד לבחירת בוקר, צהריים, ערב או בין הארוחות.
- אריחי צילום והוספה ידנית בוטלו; הוספה ידנית הפכה לכפתור ברור בכותרת רשימת הארוחות.
- כפתור המצלמה בסרגל פותח את בורר המערכת לצילום, גלריה או קובץ בהתאם למכשיר.

## 1.7.8

- פירוט חלבון, פחמימות ושומן מוצג כאקורדיון מתחת לבר שנלחץ, עם רשימת מאכל וכמות בלבד וללא חלון קופץ.
- חלון פרטי הארוחה כולל פעולת חזרה ברורה, וכל יעד בסרגל התחתון סוגר אותו לפני הניווט.

## 1.7.7

- ניווט באמצעות הסרגל התחתון סוגר גם את חלון פירוט אבות המזון ואת חלון פרטי הארוחה, כך שכפתור ״היום״ מחזיר תמיד לדף הבית.

## 1.7.6

- כפתור המצלמה המרכזי בסרגל התחתון פותח ישירות את המצלמה האחורית במכשירים תומכים; בחירת גלריה נשארת זמינה באריח צילום הארוחה.

## 1.7.5

- ליד המשקל הנוכחי במגמות מוצג חץ והשינוי מול המדידה הקודמת.
- אזורי המלצות הארוחות ומה שנאכל היום הועברו לתחתית דף הבית, ולהמלצות נוסף רענון.
- ממוצעי הפחמימות והשומן השבועיים מחושבים כעת מנתוני הארוחות בפועל.
- תמונות קטגוריה גנריות מוחלפות ברקע בתמונה תואמת מהקטלוג או ממודל התמונות ונשמרות גם להיסטוריה.
- הממשק הכהה עבר לרקע שחור־אפור גרניט ללא הגוון החום.
- כפתורי הסגירה, ידית הגרירה וקו הכותרת הוסרו ממסכי המובייל שבהם הסרגל התחתון הוא מקור הניווט.
- לחיצה על בר חלבון, פחמימות או שומן מציגה רשימה נקייה של המאכלים והכמות שתרמה לבר.
- סל המחזור נגיש ממרכז הניהול וכולל שחזור ומחיקה לצמיתות.
- לחיצה על תמונת ארוחה ב״מה אכלתי היום״ פותחת תצוגה מלאה עם התמונה, השעה, המרכיבים והערכים התזונתיים.

## 1.7.4

- נוסף מעל “מה אכלתי היום” אריח המלצות ארוחה לבוקר, צהריים, ערב ובין הארוחות.
- ההמלצות מדורגות לפי החוסרים היומיים בחלבון, פחמימות ושומן ולפי ההעדפות האישיות שנשמרו.
- מגבלות, אלרגיות וצמחונות/טבעונות מסוננות לפני דירוג הטעם כדי למנוע הצעה לא מתאימה.
- בכרטיס האישי נוסף אשף אופציונלי ונוח לבחירת מאכלים וסגנונות שאוהבים, ניטרליים או לא אוהבים וזמן הכנה מועדף.
- פרופיל הטעם נשמר באופן מובנה ומשמש גם את מנוע ההמלצות וגם את הקשר המאמן האישי ב־AI.

## 1.7.3

- הסרגל התחתון הפך למקור הניווט בנייד: “היום” סוגר כל מסך פתוח והיעדים האחרים מחליפים זה את זה ללא צורך בכפתור X.
- הוספת ארוחה ידנית מתחילה בתיאור קצר בלבד, עם הכתבה וחישוב קלוריות באמצעות AI; שדות הבדיקה נפתחים רק לאחר הניתוח.
- המלל הקטן מעל כותרות המסכים הנפתחים ומעל כותרות האריחים הראשיים הוסר.
- פס המים הוגבה ועריכת המים כוללת יעד שתייה יומי בטווח 1.5–2.75 ליטר, הנשמר בפרופיל ומשפיע על הציון.
- קצה פס הציון מוצג כחץ צבעוני שממחיש את נקודת ההתקדמות.

## 1.7.2

- אריח המים הועבר לפני המלצת המאמן; פס המים הוגבה, כיוון המילוי הותאם לשאר הפסים וכפתורי ההוספה וההפחתה מוקמו משני צדדיו.
- מתחת לברכת הבית מוצג משפט קצר ומעשי לפי הציון היומי.
- בהיסטוריה נוסף סיכום מילולי בן משפט או שניים לכל יום, בצבע הציון ועם מוקד השיפור המשמעותי ביותר.
- ה־Onboarding כולל בחירה ותצוגה מקדימה של ממשק כהה או בהיר.
- תוקנה התאמת שמות הקטלוג כך ששמות מדויקים, כגון תפוח, לא יתאימו בטעות למזון אחר כגון תפוח אדמה.
- מגמות הסוכר משלימות נתונים מארוחות ישנות לפי רכיבי ארוחה תואמי קטלוג; כשאין כיסוי מוצג “אין נתונים” במקום 0g מטעה.
- בממוצע השבועי נוספו פחמימות ושומן ליום מול היעדים, בצבעים הקבועים של המאקרו.
- המלל `Day · Week · Month` הוסר מכותרת מסך המגמות.
- כל המסכים הנפתחים בנייד, כולל הצ׳אט, מוצגים מקצה לקצה עם כותרת דביקה ו־safe area.
- סרגל הניווט התחתון נשאר גלוי ונגיש בכל המסכים הנפתחים בנייד.
- לחיצה על צילום ארוחה פותחת ישירות את בורר המערכת לצילום או לבחירה מהגלריה, ללא מסך ביניים.
- במסך הוספת אוכל נוסף חיפוש גלובלי ומהיר בארוחות, פירות, ירקות, משקאות והמאגר האישי.

## 1.7.1

- שמירת ארוחה מציגה כעת מצב שמירה ברור ואינה משאירה כפתור מושבת ללא הסבר.
- שדות בטוחים להשלמה, כגון שם ארוחה, כמות, תאריך וקלוריות הנגזרות ממאקרו, מתמלאים אוטומטית לפני שמירה.
- שדות שלא ניתן להשלים בבטחה מסומנים, מפורטים בהודעה ומקבלים מיקוד אוטומטי; לחיצות שמירה כפולות נחסמות.
- שגיאות השרת מציינות במפורש אילו שדות נדרשים במקום הודעת שמירה כללית.
- בצ׳אט נוסף ניקוי תצוגה שאינו מוחק את ההיסטוריה, יחד עם שאלות HELP ושאלות שימושיות מוכנות.
- צבע סיכום היום בהיסטוריה מותאם לציון היומי בחמשת טווחי הצבעים.
- במסך מגמות ניתן להוסיף מדידת משקל מתוארכת תוך שמירה מלאה של היסטוריית המדידות.
- נוסף גרף קו של מגמת המשקל, שינוי כולל ורשימת מדידות עם שינוי מול המדידה הקודמת.
- בכרטיס האישי המשקל הנוכחי מסומן כמדידה הנשמרת בהיסטוריה ומוצג יחד עם תאריך המדידה האחרונה.
- הבארים במגמות מציגים מדד, ערך בפועל, יעד, אחוז והסבר עבור קלוריות, חלבון, מים ופעילות.
- היסטוריית הציונים ב־14 הימים האחרונים מוצגת ככרטיסי יום ברורים בצבע הציון.
- למשתמש שסימן מצב סוכר מוצגים סיכומי צריכת סוכרים תזונתיים ליום, ל־7 ימים ול־30 ימים וגרף חודשי לפי כיסוי הנתונים.
- נתוני הסוכר נשמרים בנפרד מפחמימות ממקורות תזונה תואמים, עם הבהרה שאינם מדידת גלוקוז או סוכר מוסף.
- ארוחה ללא תמונה מנסה לקבל תמונה תואמת מהקטלוג, ובאפשרות יצירה פעילה משלימה תמונה ברקע בלי לעכב או לבטל את השמירה.
- אותה תמונה נשמרת ברשומת הארוחה ומשמשת את “מה אכלתי היום” ואת ההיסטוריה; תמונות שנוצרו נשמרות כ־WebP ממוזער וחסכוני.

## 1.7.0

- פס הציון הפך ללחיץ ומציג פירוט של מרכיבי הציון והמלצה מעשית לשיפור.
- צבע פס הציון משתנה בחמישה טווחים: אדום, כתום, צהוב, תכלת וירוק.
- כותרת אריח התזונה מציגה את היעד הקלורי היומי ואת כמות הקלוריות שנותרה, ובטבעת מוצגת הצריכה בלבד.
- מסך ההיסטוריה נפתח בלוח שנה חודשי מלא עם ניווט, צבע ציון לכל יום ותצוגת היום הנבחר מתחתיו.
- תמונות ארוחה מוקטנות בדפדפן ל־1280 פיקסלים ובאיכות מאוזנת לפני ההעלאה, לקיצור זמן ההעברה והניתוח.
- הקלטת קול משתמשת במסלול מהיר של תמלול הדפדפן ואינה מעלה או מתמללת שוב את קובץ השמע כשהתמלול המקומי זמין.
- קובצי קול במסלול הגיבוי מוקלטים בקידוד חסכוני, תוך שמירת תמלול ענן למכשירים שאינם תומכים בתמלול מקומי.

## 1.6.3

- פס הציון הוגדל והציון ממורכז וקריא גם באחוז נמוך.
- גרף המגמות נבנה מחדש כבארים אופקיים עם תאריך, צבע וציון ברור לכל יום.
- צבע שורת המערכת של ה־PWA מותאם למצב בהיר או כהה במקום להיות כהה תמיד.
- נוספה התאמת `viewport-fit` למסכי טלפון עם Safe Area.

## 1.6.2

- אריח המים כולל כפתורי פלוס ומינוס להוספה או הפחתה של 250 מ״ל, ללא ירידה מתחת לאפס.
- פס הציון מציג את הציון בפורמט `X/100`.
- טקסט כהה וקריא באריח התזונה בממשק הבהיר.
- אריחי צילום ארוחה והוספה ידנית זהים גם בגובה.
- המלצת המאמן מתחלפת באופן יציב בין מים, חלבון, מאזן קלורי, תזמון ארוחות וגיוון תזונתי.
- צבעי חלבון, פחמימות ושומן נשארים קבועים ואחידים גם בסיכומי ההיסטוריה.

## 1.6.1

- הציון היומי הוחלף בפס ירוק נקי המתמלא מ־0 עד 100 ללא מלל.
- טבעת הקלוריות הוגדלה, הועברה מעל בארי המאקרו והפכה ללחצן הפותח את הסבר חישוב היעד.
- נוספו אנימציות מילוי חיות לטבעת הקלוריות ולבארי החלבון, הפחמימות והשומן.
- אריחי צילום ארוחה והוספה ידנית קיבלו רוחב זהה.

## 1.6.0

- כותרת דף בית נקייה עם ברכה בלבד וגרף ציון יומי נפרד.
- אריח יומי חדש עם עיגול קלוריות דינמי המציג נצרך, יעד ויתרה.
- בארים רחבים לחלבון, פחמימות ושומן עם אחוז התקדמות, יעד יומי וכמות שנצרכה.
- שפת צבעי מאקרו אחידה: חלבון תכלת, פחמימות צהוב ושומן סגול.
- פירוט חישוב היעד עבר לכפתור מידע קומפקטי בפינת האריח.
- פריסה מותאמת למובייל ולמצב כהה.

## 1.5.2

- תיקון פורמט התאריך בסביבת Home Assistant/Alpine באמצעות בנייה קשיחה של `YYYY-MM-DD` ללא תלות ב־locale המותקן.
- ארוחות היום חוזרות לדף הבית ולחישוב היומי, ורשומת היום המדומה שהוצגה כ־`Invalid Date` מוסרת.
- גם בדיקת מעבר היום בצד הדפדפן אינה תלויה עוד בפורמט `en-CA` של המכשיר.

## 1.5.1

- תיקון סיווג ארוחות היום לפי אזור הזמן האישי, כך שארוחה שנשמרה לא נעלמת מדף הבית להיסטוריה.
- איפוס תאריך ושעת הארוחה בכל פתיחת תהליך חדש ואימות השמירה בקריאה חוזרת ממסד הנתונים.
- סינון ותיקון רשומות יום ישנות מסוג `Invalid Date` בלי לפגוע בארוחות תקינות.
- תיקון המרת אנרגיה ממקור USDA מ־kJ ל־kcal ומקור תזונתי ייעודי לקפה, קפה עם חלב ותה.
- חסימת תוצאות צילום בלתי סבירות למשקאות לפני שמירה, עם בקשה לבדוק כמות ותוספות.

## 1.5.0

- מרכז ניהול מסד נתונים עם נפח, מספר רשומות, פירוט טבלאות ורשומות מתות.
- בדיקת שלמות ואופטימיזציית PostgreSQL מתוך ADMIN עם הרשאות ואירועי Audit.
- שמירת תמונות זמנית באחסון פנימי כאשר Share או Media אינם זמינים, בלי לאבד את הארוחה.
- ספירת קובצי מדיה ממתינים וסנכרון יזום ליעד הקבוע לאחר חזרת האחסון.
- תור IndexedDB מקומי לצילומי ארוחות שנוצרו ללא חיבור לרשת.
- שליחה חוזרת אוטומטית ואידמפוטנטית של צילומים כאשר החיבור חוזר.
- בדיקת איכות ורזולוציית צילום לפני ניתוח הארוחה והנחיה לצילום חוזר כשנדרש.
- רמת הביטחון של זיהוי ה־AI נשמרת עם הארוחה המאושרת.
- מסך תוצאה ברור לאחר הוספה או עריכה, כולל קלוריות וחלוקת מאקרו.
- כיסוי בדיקות חדש למסד הנתונים, סנכרון האחסון, צילום, אופליין ותוצאת השמירה.

## 1.4.0

- מעבר יום אמין ב־00:00 לפי אזור הזמן המקומי של המשתמש, כולל שמירה להיסטוריה ורענון אוטומטי כשהיישום נשאר פתוח.
- מספר גרסה ו־Build ב־ADMIN לצד Sessions פעילים, מצב תור הניתוח וסל המחזור.
- סנכרון אוטומטי בין מסכים ומכשירים כל 30 שניות ולאחר חזרה ליישום.
- תור ניתוח תמונות עם מזהה יציב, ניסיונות חוזרים, מצבי עבודה ברורים ואפשרות Retry לאחר כשל.
- מודל ראשי ומודל גיבוי נפרדים למאמן, לזיהוי ארוחה וליצירת תמונות.
- הנחיות צילום וביטחון לפני אישור משקל וכמויות; ערכים תזונתיים ממשיכים להגיע ממקור נפרד מהראייה.
- יעדים צבעוניים, דוח שבועי, מגמות והמלצת מאמן נשמרו ושולבו עם הרענון החדש.
- מרכז הניהול הורחב במדדי תפעול ואבחון שימושיים.
- בחירת גיבוי מסד נתונים, הגדרות או גיבוי מלא הכולל תמונות, עם Safety Backup לפני שחזור.
- מדיניות גיבוי מתוזמן ושמירת גיבויים ניתנות לניהול; ייצוא ומחיקת נתוני משתמש ממשיכים לכסות את כל המידע הפרטי.

## 1.3.2

- כרטיס "יום ברצף" משתמש כעת במשטח ובצבעי טקסט תקינים בממשק הכהה.
- רשימת "מה אכלתי היום" בנייד סודרה לגריד קומפקטי ויציב ללא שבירת תוכן וגלילה אופקית.

## 1.3.1

- דף בית נקי יותר עם שתי פעולות ראשיות, המלצת מאמן יחידה ו־Timeline ארוחות רגוע.
- שפת אייקוני קו אחידה למצלמה, גלריה, הוספה, מאמן, מים, פעילות, ניווט ועריכה.
- שורת ארוחה מציגה פעולת עריכה בלבד; מחיקה נשארה בתוך חלון העריכה עם Undo.

## 1.3.0

- פרופיל בריאות פרטי: מצב סוכר, לחץ דם, אלרגיות, תרופות רלוונטיות והריון/הנקה; ההקשר מועבר למאמן AI עם גבולות בטיחות.
- עריכת ארוחות קיימות, שינוי כמות מהיר ו־Undo לאחר מחיקה.
- חיפוש וסינון בספריית המאכלים, יעדים מותאמים וטווחי יעד, ודוח שבועי עם עקביות והמלצת זהב.
- שיפור נגישות וקריאות בטלפון, כולל יעדי מגע, focus והפחתת תנועה.

## 1.2.1

- Replaced undersized fruit and vegetable sprites with complete, position-safe photographic sprite sheets.
- Fixed the history timeline so each event is a horizontal row on one vertical axis without page-width overflow.
- Added calorie and macro target comparisons with below, near, in-range and over-target color states.
- Restored release-note and runtime-version updates across all version sources.

## 1.2.0

- Rebuilt history as a visual timeline and redesigned today's chronological meal list.
- Added food-library management, expanded quick foods, coach recommendations and improved mobile readability.
- Fixed Gemini image generation and automatic state refresh after manual changes.

## 1.1.1

- Fixed PostgreSQL startup inside the Home Assistant image and added a real container boot gate to CI.

## 1.1.0

- Added normalized PostgreSQL persistence, role-specific AI models, security controls, backups, jobs and nutrition-source separation.

## 1.0.3

- Rebuilt the Admin Center as a focused, tabbed commercial management interface instead of one oversized scrolling form.
- Adopted the proven PROJECTS mobile-sheet pattern for every dialog: safe-area sizing, stable headers, scrollable content and sticky actions.
- Fixed the CSS rule that unintentionally erased all fruit, vegetable and drink sprite images.
- Prevented optional AI artwork failures from discarding a successfully calculated food item; nutrition is returned with a clear image warning and safe visual fallback.

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
