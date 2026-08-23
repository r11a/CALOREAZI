const DAY_MS = 86400000;

export const goalModes = {
  lose: { label: "חיטוב", weeklyRatePercent: -0.4 },
  maintain: { label: "שמירה", weeklyRatePercent: 0 },
  gain: { label: "עלייה במסת שריר", weeklyRatePercent: 0.2 },
  fitness: { label: "ביצועים והתאוששות", weeklyRatePercent: 0 },
  healthy: { label: "אורח חיים מאוזן", weeklyRatePercent: 0 },
};

function localDay(value) { return String(value || "").slice(0, 10); }
function dayNumber(value) { const time = new Date(`${localDay(value)}T12:00:00Z`).getTime(); return Number.isFinite(time) ? time / DAY_MS : null; }
function average(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }

function weightTrend(measurements = []) {
  const byDate = new Map();
  for (const item of measurements) { const x = dayNumber(item.date || item.at); const weight = Number(item.weight); if (x != null && weight >= 25 && weight <= 350) byDate.set(localDay(item.date || item.at), { x, weight }); }
  const points = [...byDate.values()].sort((a, b) => a.x - b.x).slice(-12);
  if (points.length < 2) return { points, weeklyKg: null, spanDays: 0 };
  const xMean = average(points.map((item) => item.x)); const yMean = average(points.map((item) => item.weight));
  const denominator = points.reduce((sum, item) => sum + (item.x - xMean) ** 2, 0);
  const slope = denominator ? points.reduce((sum, item) => sum + (item.x - xMean) * (item.weight - yMean), 0) / denominator : 0;
  return { points, weeklyKg: Math.round(slope * 700) / 100, spanDays: Math.round(points.at(-1).x - points[0].x) };
}

export function evaluateGoalPlan({ profile = {}, measurements = [], days = [], now = new Date() }) {
  const mode = goalModes[profile.goal] || goalModes.healthy; const currentWeight = Number(measurements.at(-1)?.weight || profile.weight || profile.initialWeight || 0);
  const trend = weightTrend(measurements.filter((item) => now.getTime() - new Date(`${localDay(item.date || item.at)}T12:00:00Z`).getTime() <= 42 * DAY_MS));
  const recentDays = days.filter((day) => { const age = now.getTime() - new Date(`${localDay(day.date)}T12:00:00Z`).getTime(); return age >= 0 && age <= 21 * DAY_MS; });
  const trackedDays = recentDays.filter((day) => Array.isArray(day.meals) && day.meals.length > 0); const completeDays = trackedDays.filter((day) => day.meals.length >= 2);
  const averageCalories = Math.round(average(trackedDays.map((day) => day.meals.reduce((sum, meal) => sum + Number(meal.kcal || 0), 0))));
  const adherence = Math.round(Math.min(100, completeDays.length / 14 * 100));
  const calibrationScore = Math.round(Math.min(100, Math.min(40, trend.points.length * 8) + Math.min(25, trend.spanDays / 21 * 25) + Math.min(35, completeDays.length / 14 * 35)));
  const calibrationLevel = calibrationScore >= 80 ? "מכויל היטב" : calibrationScore >= 55 ? "מגמה ראשונית" : calibrationScore >= 30 ? "מתחילים להכיר אותך" : "נדרשים עוד נתונים";
  const missing = []; if (trend.points.length < 4) missing.push(`עוד ${4 - trend.points.length} שקילות`); if (trend.spanDays < 14) missing.push("לפחות 14 ימים בין המדידות"); if (completeDays.length < 10) missing.push(`עוד ${10 - completeDays.length} ימי תיעוד מלאים`);
  const targetWeeklyKg = Math.round(currentWeight * mode.weeklyRatePercent) / 100; const lastAdjustmentAt = profile.goalAdjustmentHistory?.at(-1)?.acceptedAt || profile.cycleStartedAt || profile.completedAt;
  const cooldownDays = lastAdjustmentAt ? Math.floor((now.getTime() - new Date(lastAdjustmentAt).getTime()) / DAY_MS) : 99; const ready = missing.length === 0 && adherence >= 70 && cooldownDays >= 14 && trend.weeklyKg != null;
  let delta = 0; if (ready && profile.goal === "lose") delta = trend.weeklyKg > targetWeeklyKg + .15 ? -100 : trend.weeklyKg < targetWeeklyKg - .2 ? 100 : 0;
  if (ready && profile.goal === "gain") delta = trend.weeklyKg < targetWeeklyKg - .1 ? 100 : trend.weeklyKg > targetWeeklyKg + .2 ? -100 : 0;
  if (ready && ["maintain", "fitness", "healthy"].includes(profile.goal)) delta = trend.weeklyKg > .25 ? -100 : trend.weeklyKg < -.25 ? 100 : 0;
  const currentCalories = Number(profile.calories || 2000); const proposal = delta ? { delta, currentCalories, suggestedCalories: currentCalories + delta, title: delta > 0 ? "הצעה להוסיף מעט אנרגיה" : "הצעה להפחתה מתונה", reason: `מגמת המשקל היא ${trend.weeklyKg > 0 ? "+" : ""}${trend.weeklyKg} ק״ג לשבוע, לעומת קצב מסלול של ${targetWeeklyKg > 0 ? "+" : ""}${targetWeeklyKg} ק״ג.` } : null;
  const status = !ready ? `עדיין לא משנים יעד: ${missing[0] || "איכות התיעוד אינה מספקת"}.` : proposal ? proposal.reason : "הקצב הנוכחי מתאים למסלול; אין צורך בשינוי כרגע.";
  return { mode: { key: profile.goal || "healthy", ...mode }, journey: profile.journey || { stage: "starting" }, currentWeight, targetWeight: Number(profile.targetWeight || 0), targetWeeklyKg, observedWeeklyKg: trend.weeklyKg, averageCalories, adherence, trackedDays: completeDays.length, measurements: trend.points.length, spanDays: trend.spanDays, calibration: { score: calibrationScore, level: calibrationLevel, missing }, cooldownDays, status, proposal };
}
