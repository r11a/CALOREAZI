import { requireUser } from "@/server/auth.js";
import { calculateDayScore } from "@/server/nutrition.js";
import { ensureUserData, readState } from "@/server/store.js";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const data = ensureUserData(state, session.userId); const days = [...data.history, data.today].sort((a, b) => a.date.localeCompare(b.date)).slice(-31);
  const daily = days.map((day) => ({ date: day.date, waterMl: Number(day.waterMl || 0), meals: day.meals.length, ...calculateDayScore(day, data.profile, data.activity) }));
  const recent = daily.slice(-7); const previous = daily.slice(-14, -7); const average = (items, key) => items.length ? Math.round(items.reduce((sum, item) => sum + Number(key(item) || 0), 0) / items.length) : 0;
  const measurements = data.measurements.slice(-31); const weightChange = measurements.length > 1 ? Math.round((Number(measurements.at(-1).weight) - Number(measurements[0].weight)) * 10) / 10 : 0;
  const activity = data.activity.filter((item) => item.date >= days.at(-7)?.date); const steps = activity.reduce((sum, item) => sum + Number(item.steps || 0), 0); const minutes = activity.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  return Response.json({ daily, summary: { weeklyScore: average(recent, (item) => item.score), previousWeeklyScore: average(previous, (item) => item.score), averageCalories: average(recent, (item) => item.totals.kcal), averageProtein: average(recent, (item) => item.totals.protein), averageWater: average(recent, (item) => item.waterMl), weightChange, steps, activeMinutes: minutes }, narrative: weightChange ? `מגמת המשקל ב־30 הימים האחרונים היא ${weightChange > 0 ? "עלייה" : "ירידה"} של ${Math.abs(weightChange)} ק״ג.` : "נדרשות לפחות שתי מדידות משקל כדי לזהות מגמה." });
}
