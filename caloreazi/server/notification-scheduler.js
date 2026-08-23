import { calculateDayScore } from "./nutrition.js";
import { normalizeNotificationPreferences } from "./notification-preferences.js";
import { sendPush } from "./push.js";
import { ensureUserData, readState, updateState } from "./store.js";
import { userTimeZone } from "./local-date.js";

function localClock(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(now);
  const get = (type) => parts.find((item) => item.type === type)?.value || "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")), weekday: get("weekday") };
}
function minutes(value) { const [hour, minute] = String(value).split(":").map(Number); return hour * 60 + minute; }
export function notificationIsDue(nowMinutes, value) { const target = minutes(value); return nowMinutes >= target && nowMinutes < target + 5; }
export function notificationIsQuiet(nowMinutes, start, end) { const from = minutes(start); const until = minutes(end); return from === until ? false : from < until ? nowMinutes >= from && nowMinutes < until : nowMinutes >= from || nowMinutes < until; }
function morningDeliveryTime(preferences) { return notificationIsQuiet(7 * 60 + 30, preferences.quietStart, preferences.quietEnd) ? preferences.quietEnd : "07:30"; }
function totals(day) { return (day.meals || []).reduce((sum, meal) => ({ kcal: sum.kcal + Number(meal.kcal || 0), protein: sum.protein + Number(meal.protein || 0), carbs: sum.carbs + Number(meal.carbs || 0), fat: sum.fat + Number(meal.fat || 0) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }); }
function previousDate(date) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() - 1); return value.toISOString().slice(0, 10); }

function candidateMessages(data, preferences, clock) {
  const day = data.today; const profile = data.profile || {}; const result = []; const consumed = totals(day); const target = Number(profile.calories || 0); const mealPeriods = new Set((day.meals || []).map((meal) => meal.period));
  const add = (type, title, body, url = "./") => result.push({ type, title, body, url });
  if (preferences.morningBrief && notificationIsDue(clock.minutes, morningDeliveryTime(preferences))) { const yesterday = (data.history || []).find((item) => item.date === previousDate(clock.date)); const yesterdayTotals = totals(yesterday || {}); const yesterdayScore = yesterday ? calculateDayScore(yesterday, profile, data.activity).score : null; const recap = yesterdayScore == null ? "אתמול עדיין לא נרשמו מספיק נתונים לסיכום." : `אתמול: ציון ${yesterdayScore}/100 ו־${Math.round(yesterdayTotals.kcal)} קלוריות.`; add("morning-brief", "בוקר טוב ☀️", `${recap} להיום היעד הוא ${target || "—"} קלוריות — מתחילים יום חדש בקצב שלך.`); }
  if (preferences.mealReminders && notificationIsDue(clock.minutes, preferences.breakfastTime) && !mealPeriods.has("breakfast")) add("meal-breakfast", "בוקר טוב", "עדיין לא נרשמה ארוחת בוקר. אם אכלת, אפשר לעדכן בכמה שניות.");
  if (preferences.mealReminders && notificationIsDue(clock.minutes, preferences.lunchTime) && !mealPeriods.has("lunch")) add("meal-lunch", "תזכורת עדינה", "אכלת צהריים? עדכון קצר יעזור לשמור על תמונת היום מדויקת.");
  if (preferences.mealReminders && notificationIsDue(clock.minutes, preferences.dinnerTime) && !mealPeriods.has("dinner")) add("meal-dinner", "ארוחת ערב", "אם כבר אכלת ערב, כדאי לעדכן לפני שסוגרים את היום.");
  if (preferences.waterReminders && notificationIsDue(clock.minutes, preferences.waterTime) && Number(day.waterMl || 0) < Number(profile.waterMl || 2000) * .6) add("water", "תזכורת מים", `נרשמו היום ${Number(day.waterMl || 0)} מ״ל מתוך ${Number(profile.waterMl || 2000)} מ״ל.`);
  if (preferences.coachTips && notificationIsDue(clock.minutes, preferences.coachTime) && (day.meals || []).length) { const proteinGap = Math.max(0, Number(profile.protein || 0) - consumed.protein); add("coach", "המלצת המאמן", proteinGap > 20 ? `חסרים בערך ${Math.round(proteinGap)} גרם חלבון ליעד. בארוחה הבאה כדאי לשלב מקור חלבון.` : "היום מתקדם בצורה מאוזנת. המשך לבחור ארוחה שמתאימה לרעב שלך."); }
  if (preferences.insights && notificationIsDue(clock.minutes, "18:30") && (day.meals || []).length >= 2) add("insight", "תובנת היום", target && consumed.kcal > target ? "היום עבר את יעד הקלוריות. אין צורך להילחץ — אפשר להתמקד בארוחה קלה ומספקת." : `נותרו בערך ${Math.max(0, Math.round(target - consumed.kcal))} קלוריות במסגרת היעד היומי.`);
  if (preferences.dailySummary && notificationIsDue(clock.minutes, preferences.summaryTime) && ((day.meals || []).length || day.waterMl)) { const score = calculateDayScore(day, profile, data.activity).score; add("summary", "סיכום היום שלך", `הציון היומי הוא ${score}/100 ונצרכו ${Math.round(consumed.kcal)} מתוך ${target} קלוריות.`); }
  if (preferences.weeklyTrends && clock.weekday === "Sun" && notificationIsDue(clock.minutes, preferences.weeklyTime) && (data.history || []).length >= 3) { const days = [...data.history, day].slice(-7); const average = Math.round(days.reduce((sum, item) => sum + totals(item).kcal, 0) / days.length); add("weekly", "המגמה השבועית מוכנה", `הממוצע השבועי הוא ${average} קלוריות ליום. אפשר לראות את התמונה המלאה במגמות.`); }
  if (preferences.weightReminder && notificationIsDue(clock.minutes, "09:30")) { const latest = [...(data.measurements || [])].sort((a, b) => new Date(b.at || b.date || 0) - new Date(a.at || a.date || 0))[0]; const age = latest ? Date.now() - new Date(latest.at || latest.date).getTime() : Infinity; if (age > 14 * 86400000) add("weight", "זמן למדידת משקל", "עברו יותר משבועיים מהמדידה האחרונה. מדידה חדשה תחדד את המגמה."); }
  if (preferences.achievements && notificationIsDue(clock.minutes, "20:45")) { const score = calculateDayScore(day, profile, data.activity).score; if (score >= 80) add("achievement", "יום מאוזן", `הגעת לציון ${score}. זה הישג שקט של עקביות, לא מבחן שצריך להיות מושלם בו.`); }
  return result;
}

export async function processDueNotifications(now = new Date()) {
  const state = await readState(); const configuration = state.systemSettings?.webPush; const subscriptions = configuration?.subscriptions || [];
  if (!subscriptions.length) return false;
  const delivery = configuration.delivery || {}; const jobs = [];
  for (const user of state.users || []) {
    const userSubscriptions = subscriptions.filter((item) => item.userId === user.id); if (!userSubscriptions.length || user.disabled) continue;
    const data = ensureUserData(state, user.id); if (!data.profile?.notificationPreferences) continue;
    const preferences = normalizeNotificationPreferences(data.profile.notificationPreferences); if (!preferences.enabled) continue;
    const clock = localClock(userTimeZone(data), now); if (notificationIsQuiet(clock.minutes, preferences.quietStart, preferences.quietEnd)) continue;
    const sentToday = Object.keys(delivery).filter((key) => key.startsWith(`${user.id}:`) && key.endsWith(`:${clock.date}`)).length;
    for (const message of candidateMessages(data, preferences, clock).slice(0, Math.max(0, preferences.maxPerDay - sentToday))) {
      const key = `${user.id}:${message.type}:${clock.date}`; if (delivery[key]) continue;
      jobs.push({ key, userId: user.id, subscriptions: userSubscriptions, message });
    }
  }
  if (!jobs.length) return false;
  const completed = []; const expired = [];
  for (const job of jobs) { let delivered = false; for (const subscription of job.subscriptions) { try { await sendPush(subscription, { ...job.message, tag: job.message.type }); delivered = true; } catch (error) { if ([404, 410].includes(Number(error?.statusCode || 0))) expired.push(subscription.endpoint); } } if (delivered) completed.push(job.key); }
  if (completed.length || expired.length) await updateState((latest) => { const push = latest.systemSettings?.webPush; if (!push) return latest; push.delivery = push.delivery || {}; for (const key of completed) push.delivery[key] = new Date().toISOString(); push.delivery = Object.fromEntries(Object.entries(push.delivery).slice(-5000)); if (expired.length) push.subscriptions = (push.subscriptions || []).filter((item) => !expired.includes(item.endpoint)); return latest; });
  return completed.length > 0;
}
