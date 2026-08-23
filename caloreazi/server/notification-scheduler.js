import { calculateDayScore } from "./nutrition.js";
import { normalizeNotificationPreferences } from "./notification-preferences.js";
import { buildNotificationCopy } from "./notification-copy.js";
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

export function candidateMessages(data, preferences, clock, userName) {
  const day = data.today; const profile = data.profile || {}; const result = []; const consumed = totals(day); const target = Number(profile.calories || 0); const mealPeriods = new Set((day.meals || []).map((meal) => meal.period));
  const score = calculateDayScore(day, profile, data.activity); const available = (score.parameters || []).filter((item) => item.available); const weakest = [...available].sort((a, b) => a.percent - b.percent)[0];
  const add = (type, context = {}, url = "./", deliveryType = type) => result.push({ type: deliveryType, ...buildNotificationCopy(type, userName, context, `${clock.date}:${deliveryType}`), url });
  const coachingAdvice = () => {
    if (!day.meals?.length) return "כדאי לתעד את הארוחה הבאה כדי שאוכל לכוון אותך לפי היום האמיתי שלך.";
    if (weakest?.key === "fiber") return `הסיבים עדיין נמוכים. בארוחה הבאה אפשר לשלב קטניות, ירקות, פרי או דגן מלא.`;
    if (weakest?.key === "produce") return `חסרים ירקות ופירות ביחס ליעד. תוספת צבעונית אחת בארוחה הבאה תעזור.`;
    if (weakest?.key === "protein") return `חסרים כ־${Math.max(0, Math.round(Number(profile.protein || 0) - consumed.protein))} גרם חלבון. כדאי לבחור מקור חלבון בארוחה הבאה.`;
    if (weakest?.key === "water") return `קצב השתייה נמוך מהיעד. כוס מים עכשיו תשמור על קצב נוח.`;
    if (target && consumed.kcal < target * .55 && clock.minutes >= 16 * 60) return `נותר פער גדול בקלוריות. עדיף לתכנן ארוחה מאוזנת ולא להשלים הכול מאוחר.`;
    return weakest?.tip || "היום מתקדם בצורה טובה. בחירה אחת מאוזנת בארוחה הבאה תמשיך את הכיוון.";
  };
  if (preferences.morningBrief && notificationIsDue(clock.minutes, morningDeliveryTime(preferences))) { const yesterday = (data.history || []).find((item) => item.date === previousDate(clock.date)); const yesterdayTotals = totals(yesterday || {}); const yesterdayScore = yesterday ? calculateDayScore(yesterday, profile, data.activity).score : null; const recap = yesterdayScore == null ? "אתמול עדיין לא נרשמו מספיק נתונים." : `אתמול: ציון ${yesterdayScore}/100 ו־${Math.round(yesterdayTotals.kcal)} קלוריות.`; add("morning-brief", { recap, target: target || "—" }); }
  if (preferences.mealReminders && notificationIsDue(clock.minutes, preferences.breakfastTime) && !mealPeriods.has("breakfast")) add("meal-breakfast");
  if (preferences.mealReminders && notificationIsDue(clock.minutes, preferences.lunchTime) && !mealPeriods.has("lunch")) add("meal-lunch");
  if (preferences.mealReminders && notificationIsDue(clock.minutes, preferences.dinnerTime) && !mealPeriods.has("dinner")) add("meal-dinner");
  if (preferences.waterReminders && notificationIsDue(clock.minutes, preferences.waterTime) && Number(day.waterMl || 0) < Number(profile.waterMl || 2000) * .6) add("water", { current: Number(day.waterMl || 0), target: Number(profile.waterMl || 2000) });
  if (preferences.coachTips && notificationIsDue(clock.minutes, preferences.coachTime)) add("coach", { advice: coachingAdvice() }, "./", "coach-personal");
  if (preferences.coachTips) for (const [time, slot] of [["10:30","morning"],["12:30","noon"],["15:30","afternoon"],["17:30","evening"],["19:30","night"]]) if (notificationIsDue(clock.minutes, time)) add("coach", { advice: coachingAdvice() }, "./", `coach-${slot}`);
  if (preferences.insights && (day.meals || []).length) for (const [time, slot] of [["12:00","noon"],["16:00","afternoon"],["20:00","evening"]]) if (notificationIsDue(clock.minutes, time)) add("progress", { calories: Math.round(consumed.kcal), target, focus: coachingAdvice() }, "./", `progress-${slot}`);
  if (preferences.insights && notificationIsDue(clock.minutes, "18:30") && (day.meals || []).length >= 2) add("insight", { insight: target && consumed.kcal > target ? "היום עבר את היעד. אפשר לבחור בהמשך ארוחה קלה ומספקת." : `נותרו כ־${Math.max(0, Math.round(target - consumed.kcal))} קלוריות במסגרת היעד.` });
  if (preferences.dailySummary && notificationIsDue(clock.minutes, preferences.summaryTime) && ((day.meals || []).length || day.waterMl)) { const score = calculateDayScore(day, profile, data.activity).score; add("summary", { score, calories: Math.round(consumed.kcal), target }); }
  if (preferences.weeklyTrends && clock.weekday === "Sun" && notificationIsDue(clock.minutes, preferences.weeklyTime) && (data.history || []).length >= 3) { const days = [...data.history, day].slice(-7); const average = Math.round(days.reduce((sum, item) => sum + totals(item).kcal, 0) / days.length); add("weekly", { average }); }
  if (preferences.weightReminder && notificationIsDue(clock.minutes, "09:30")) { const latest = [...(data.measurements || [])].sort((a, b) => new Date(b.at || b.date || 0) - new Date(a.at || a.date || 0))[0]; const age = latest ? Date.now() - new Date(latest.at || latest.date).getTime() : Infinity; if (age > 14 * 86400000) add("weight"); }
  if (preferences.achievements && notificationIsDue(clock.minutes, "20:45")) { const score = calculateDayScore(day, profile, data.activity).score; if (score >= 80) add("achievement", { score }); }
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
    for (const message of candidateMessages(data, preferences, clock, user.name || data.profile?.name).slice(0, Math.max(0, preferences.maxPerDay - sentToday))) {
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
