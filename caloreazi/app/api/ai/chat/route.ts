/* eslint-disable @typescript-eslint/no-explicit-any */
import { decryptSecret, ensureUserData, readState, updateState } from "@/server/store.js";
import { generateOpenAiCoachReply } from "@/server/ai/openai.js";
import { generateGeminiCoachReply } from "@/server/ai/gemini.js";
import { estimateCost, evaluateBudget } from "@/server/ai/usage.js";
import { requireUser } from "@/server/auth.js";
export const runtime = "nodejs";

function dayTotals(day: any) {
  const meals = Array.isArray(day?.meals) ? day.meals : [];
  return meals.reduce((totals: any, meal: any) => ({
    kcal: totals.kcal + Number(meal.kcal || 0),
    protein: totals.protein + Number(meal.protein || 0),
    carbs: totals.carbs + Number(meal.carbs || 0),
    fat: totals.fat + Number(meal.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

export async function POST(request: Request) {
  const { message } = await request.json();
  if (!String(message || "").trim()) return Response.json({ error: "יש לכתוב שאלה" }, { status: 400 });
  const state = await readState();
  const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const user = state.users.find((item) => item.id === session.userId);
  const userData = ensureUserData(state, session.userId);
  if (!userData?.profile) return Response.json({ error: "יש להשלים Onboarding" }, { status: 409 });
  if (!state.ai.encryptedKey) return Response.json({ error: "יש להגדיר ספק AI ומפתח API בהגדרות" }, { status: 409 });
  const month = new Date().toISOString().slice(0, 7);
  const spent = state.aiUsage.filter((item) => item.month === month).reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const budget = evaluateBudget({ spentUsd: spent, monthlyBudgetUsd: state.ai.monthlyBudget, softLimitPercent: state.ai.softLimit, hardLimitEnabled: state.ai.hardLimit });
  if (!budget.allowed) return Response.json({ error: "תקציב ה-AI החודשי הגיע למגבלה הקשיחה" }, { status: 429 });
  const profile = userData.profile;
  const measurements = [...userData.measurements].sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
  const currentWeight = Number(measurements.at(-1)?.weight || profile.weight);
  const previousWeight = measurements.length > 1 ? Number(measurements.at(-2)?.weight) : null;
  const trackedDays = [...userData.history, userData.today].slice(-30);
  const week = trackedDays.slice(-7);
  const weekTotals = week.map(dayTotals);
  const recentActivity = userData.activity.slice(-30);
  const recentConversation = userData.coachHistory.slice(-12);
  const context = {
    identity: { name: user.name, conversationAlreadyStarted: recentConversation.length > 0 },
    goals: { goal: profile.goal, currentWeightKg: currentWeight, targetWeightKg: Number(profile.targetWeight), remainingKg: Number((currentWeight - Number(profile.targetWeight)).toFixed(1)) },
    bodyAndPlan: { sex: profile.sex, age: profile.age, heightCm: profile.height, bmi: profile.caloriePlan?.bmi, bmr: profile.caloriePlan?.bmr, maintenanceKcal: profile.caloriePlan?.maintenanceCalories, dailyTargetKcal: profile.calories, proteinTargetG: profile.protein, carbsTargetG: profile.carbs, fatTargetG: profile.fat, waterTargetMl: profile.waterMl },
    preferences: { activityLevel: profile.activity, workoutsPerWeek: profile.workouts, diet: profile.diet, restrictions: profile.restrictions || "אין מגבלות מתועדות" },
    today: { date: userData.today.date, totals: dayTotals(userData.today), waterMl: userData.today.waterMl, meals: userData.today.meals.map((meal: any) => ({ time: meal.time, period: meal.period, name: meal.name, kcal: meal.kcal, protein: meal.protein, items: meal.items?.map((item: any) => `${item.quantity || 1}× ${item.name} ${item.grams || "?"}g`) })) },
    last7Days: { trackedDays: week.length, averageKcal: average(weekTotals.map((item: any) => item.kcal)), averageProteinG: average(weekTotals.map((item: any) => item.protein)), averageWaterMl: average(week.map((day: any) => Number(day.waterMl || 0))), activityMinutes: recentActivity.filter((item: any) => week.some((day: any) => day.date === item.date)).reduce((sum: number, item: any) => sum + Number(item.minutes || 0), 0) },
    progress: { previousWeightKg: previousWeight, changeFromPreviousKg: previousWeight == null ? null : Number((currentWeight - previousWeight).toFixed(1)), measurements: measurements.slice(-10) },
    learnedCorrections: userData.foodCalibration.slice(-20).map((item: any) => ({ originallyDetected: item.originalName, correctedName: item.name, gramsPerUnit: item.grams, quantity: item.quantity })),
  };
  const instructions = `אתה המאמן האישי המתמשך של CALOREAZI. השב בעברית טבעית, מדויקת ולא שיפוטית, כאדם שמכיר את המשתמש ואת התהליך שלו.
כללי חובה:
- ענה קודם ישירות על השאלה. השתמש בנתונים המספריים רק כשהם רלוונטיים.
- יעד המשקל, המשקל העדכני, התוכנית, הארוחות, המדידות וההיסטוריה נמצאים ב-USER_CONTEXT; אל תגיד שאינך יודע פרט שמופיע שם.
- אל תפתח ב"היי", "שלום" או בשם המשתמש אם conversationAlreadyStarted=true. גם בתחילת שיחה השתמש בברכה פעם אחת בלבד.
- אל תחזור על המלצה שכבר ניתנה בשיחה. בפרט אל תזכיר מים אלא אם המשתמש שאל על שתייה/התייבשות, או שיש סיבה מיידית ומשמעותית והרלוונטיות מוסברת במשפט אחד.
- התחשב בשאלה ובהודעות הקודמות. אל תיתן בכל תשובה סיכום כללי של היום.
- הבדל בבירור בין נתון שנמדד, הערכת AI ומידע שחסר. אל תמציא ארוחות, כמויות או העדפות.
- תן בדרך כלל תשובה תמציתית עם 1–3 צעדים מעשיים. שאל לכל היותר שאלת הבהרה אחת ורק אם היא נחוצה.
- אין אבחון רפואי. התריע רק כשיש סיכון ממשי; אל תנסח הסתייגות גנרית בכל תשובה.
- אם המידע סותר, העדף מדידה חדשה על פרופיל ישן והסבר את הסתירה בקצרה.`;
  const input = `USER_CONTEXT:\n${JSON.stringify(context, null, 2)}\n\nRECENT_CONVERSATION:\n${recentConversation.map((item: any) => `${item.role === "user" ? "משתמש" : "מאמן"}: ${item.text}`).join("\n") || "אין עדיין"}\n\nCURRENT_USER_MESSAGE:\n${String(message).trim()}`;
  try {
    const call = state.ai.provider === "gemini" ? generateGeminiCoachReply : generateOpenAiCoachReply;
    const result = await call({ apiKey: await decryptSecret(state.ai.encryptedKey), model: state.ai.model, instructions, input });
    const reply = recentConversation.length > 0
      ? result.text.replace(/^\s*(?:היי|שלום|אהלן)(?:\s+[^,!:.]{1,24})?\s*[,!:.—-]*\s*/u, "")
      : result.text;
    const cost = estimateCost({ inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, inputCostPerMillion: state.ai.inputCost, outputCostPerMillion: state.ai.outputCost });
    await updateState((latest) => { const data = ensureUserData(latest, session.userId); const at = new Date().toISOString(); data.coachHistory.push({ role: "user", text: String(message).trim(), at }, { role: "assistant", text: reply, at }); data.coachHistory = data.coachHistory.slice(-40); latest.aiUsage.push({ id: crypto.randomUUID(), month, at, userId: session.userId, feature: "coach", provider: latest.ai.provider, model: latest.ai.model, ...result.usage, cost }); return latest; });
    return Response.json({ reply, usage: { ...result.usage, estimatedCost: cost, budgetState: budget.state } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "AI request failed" }, { status: 502 }); }
}
