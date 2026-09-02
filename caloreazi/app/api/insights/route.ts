import { requireUser } from "@/server/auth.js";
import { calculateDayScore } from "@/server/nutrition.js";
import { estimateMealSugar } from "@/server/nutrition-catalog.js";
import { ensureUserData, readState } from "@/server/store.js";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const data = ensureUserData(state, session.userId); const days = [...data.history, data.today].sort((a, b) => a.date.localeCompare(b.date)).slice(-31);
  const daily = days.map((day) => { const estimates = day.meals.map(estimateMealSugar); const sugar = estimates.reduce((sum, item) => sum + item.sugar, 0); const trackedMeals = estimates.filter((item) => item.tracked).length; return { date: day.date, waterMl: Number(day.waterMl || 0), meals: day.meals.length, sugar: Math.round(sugar * 10) / 10, sugarCoverage: day.meals.length ? Math.round(trackedMeals / day.meals.length * 100) : 0, ...calculateDayScore(day, data.profile, data.activity) }; });
  const recent = daily.slice(-7); const previous = daily.slice(-14, -7); const average = (items, key) => items.length ? Math.round(items.reduce((sum, item) => sum + Number(key(item) || 0), 0) / items.length) : 0;
  const measurements = data.measurements.slice(-31); const referenceWeight = Number(data.profile.cycleInitialWeight || data.profile.initialWeight || data.profile.weight || 0); const currentWeight = Number(measurements.at(-1)?.weight || data.profile.weight || 0); const weightChange = referenceWeight > 0 && currentWeight > 0 ? Math.round((currentWeight - referenceWeight) * 10) / 10 : 0;
  const activity = data.activity.filter((item) => item.date >= days.at(-7)?.date); const steps = activity.reduce((sum, item) => sum + Number(item.steps || 0), 0); const minutes = activity.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const tracked = recent.filter((item) => item.meals > 0); const withinTarget = tracked.filter((item) => item.totals.kcal >= data.profile.calories * .9 && item.totals.kcal <= data.profile.calories * 1.05).length;
  const meals = days.flatMap((day) => (day.meals || []).map((meal) => ({ ...meal, logicalDate: day.date }))); const topMeal = meals.sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
  const averageProtein = average(recent, (item) => item.totals.protein); const averageWater = average(recent, (item) => item.waterMl); const averageFiber = average(recent, (item) => item.totals.fiber);
  const breakfastProtein = days.slice(-14).map((day) => { const breakfast = (day.meals || []).filter((meal) => meal.period === "breakfast"); return { protein: breakfast.reduce((sum, meal) => sum + Number(meal.protein || 0), 0), deviation: Math.abs((day.meals || []).reduce((sum, meal) => sum + Number(meal.kcal || 0), 0) - Number(data.profile.calories || 0)), tracked: (day.meals || []).length > 0 }; }).filter((item) => item.tracked);
  const proteinMornings = breakfastProtein.filter((item) => item.protein >= 20); const otherMornings = breakfastProtein.filter((item) => item.protein < 20);
  const proteinMorningBenefit = proteinMornings.length >= 2 && otherMornings.length >= 2 ? average(otherMornings, (item) => item.deviation) - average(proteinMornings, (item) => item.deviation) : 0;
  const weeklyInsight = proteinMorningBenefit >= 100
    ? `בימים שבהם ארוחת הבוקר כללה לפחות 20 גרם חלבון, סיימת בממוצע קרוב יותר ליעד הקלורי בכ־${proteinMorningBenefit} קלוריות.`
    : tracked.length >= 4 && withinTarget >= Math.ceil(tracked.length * .6)
      ? `ב־${withinTarget} מתוך ${tracked.length} ימי המעקב האחרונים נשארת בטווח הקלורי האישי שלך — זה דפוס עקבי שכדאי לשמר.`
      : averageProtein < data.profile.protein * .8
        ? `ממוצע החלבון השבועי הוא ${averageProtein} גרם. תוספת קטנה בשתי ארוחות תהיה יעילה יותר מהשלמה גדולה בערב.`
        : averageWater < data.profile.waterMl * .8
          ? `ממוצע השתייה השבועי הוא ${averageWater.toLocaleString()} מ״ל. הצמדת כוס אחת לארוחה קבועה היא השינוי הפשוט ביותר כרגע.`
          : "הנתונים עדיין נבנים. המשך תיעוד עקבי עוד כמה ימים כדי לזהות קשר אישי שימושי ולא מסקנה מקרית.";
  const recommendationPool = [
    ...(averageProtein < data.profile.protein * .9 ? ["כדאי לפזר מקור חלבון על פני שתי ארוחות לפחות.", "בארוחה הבאה נסה להתחיל ממקור חלבון שמתאים לטעם שלך."] : []),
    ...(averageWater < data.profile.waterMl * .8 ? ["קצב השתייה השבוע נמוך מהיעד; כוס אחת עכשיו היא צעד פשוט ומספיק.", "נסה להצמיד כוס מים לארוחה הבאה במקום להשלים הכול בערב."] : []),
    ...(averageFiber < 22 ? ["תוספת אחת של ירק, פרי או קטנייה היום תחזק את איכות התזונה.", "כדאי לבחור בארוחה הבאה מקור סיבים אחד שקל לך להתמיד בו."] : []),
    ...(minutes < 120 ? ["גם עשר דקות תנועה היום יכולות לחזק את מגמת השבוע."] : []),
    "העקביות חשובה מהשלמות; שמור היום על פעולה אחת שכבר עובדת לך.",
    "בחר בארוחה הבאה שילוב פשוט שאתה אוהב ושאפשר לתעד בלי מאמץ.",
  ];
  const recommendationBucket = Math.floor(Date.now() / (3 * 60 * 60 * 1000));
  const recommendation = recommendationPool[recommendationBucket % recommendationPool.length];
  const sugarDays = daily.filter((item) => item.sugarCoverage > 0); const sugarRecent = sugarDays.slice(-7); const sugarMonth = sugarDays.slice(-30);
  const month = daily.slice(-30); const trackedMonth = month.filter((item) => item.meals > 0); const weeklyCalories = average(recent, (item) => item.totals.kcal); const previousCalories = average(previous, (item) => item.totals.kcal);
  return Response.json({ daily, weeklyInsight, recommendationRefreshAt: new Date((recommendationBucket + 1) * 3 * 60 * 60 * 1000).toISOString(), sugar: { enabled: data.profile.diabetesStatus && data.profile.diabetesStatus !== "none", today: daily.at(-1)?.sugarCoverage ? daily.at(-1)?.sugar : null, weeklyAverage: sugarRecent.length ? average(sugarRecent, (item) => item.sugar) : null, monthlyAverage: sugarMonth.length ? average(sugarMonth, (item) => item.sugar) : null, coverage: average(sugarMonth, (item) => item.sugarCoverage), days: daily.slice(-30).map((item) => ({ date: item.date, sugar: item.sugar, coverage: item.sugarCoverage })) }, summary: { weeklyScore: average(recent, (item) => item.score), previousWeeklyScore: average(previous, (item) => item.score), averageCalories: weeklyCalories, previousAverageCalories: previousCalories, calorieWeeklyChange: previousCalories ? weeklyCalories - previousCalories : 0, averageProtein, averageCarbs: average(recent, (item) => item.totals.carbs), averageFat: average(recent, (item) => item.totals.fat), averageWater, monthlyAverageCalories: average(trackedMonth, (item) => item.totals.kcal), monthlyAverageProtein: average(trackedMonth, (item) => item.totals.protein), monthlyAverageWater: average(trackedMonth, (item) => item.waterMl), monthlyTrackedDays: trackedMonth.length, weightChange, referenceWeight, currentWeight, steps, activeMinutes: minutes, trackedDays: tracked.length, targetCompliance: tracked.length ? Math.round(withinTarget / tracked.length * 100) : 0, topMeal: topMeal?.name || "—", topMealDetails: topMeal ? { id: topMeal.id, name: topMeal.name, logicalDate: topMeal.logicalDate } : null }, recommendation, narrative: weightChange ? `מגמת המשקל ב־30 הימים האחרונים היא ${weightChange > 0 ? "עלייה" : "ירידה"} של ${Math.abs(weightChange)} ק״ג.` : "נדרשות לפחות שתי מדידות משקל כדי לזהות מגמה." });
}
