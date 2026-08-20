import { requireUser } from "@/server/auth.js";
import { calculateNutritionTargets } from "@/server/nutrition.js";
import { readState, updateState, userView } from "@/server/store.js";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const initial = await readState();
  const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json();
  const name = String(body.name || "").trim();
  const age = Number(body.age);
  const height = Number(body.height);
  const targetWeight = Number(body.targetWeight);
  const avatar = String(body.avatar || "");
  if (name.length < 2) return Response.json({ error: "יש להזין שם תקין" }, { status: 400 });
  if (!(age >= 14 && age <= 120) || !(height >= 100 && height <= 250)) return Response.json({ error: "יש לבדוק גיל וגובה" }, { status: 400 });
  if (!(targetWeight >= 25 && targetWeight <= 350)) return Response.json({ error: "יש להזין משקל יעד תקין" }, { status: 400 });
  if (avatar && (!avatar.startsWith("data:image/jpeg;base64,") || avatar.length > 700_000)) return Response.json({ error: "תמונת הפרופיל אינה תקינה או גדולה מדי" }, { status: 400 });

  const state = await updateState((latest) => {
    const user = latest.users.find((item) => item.id === session.userId);
    const profile = latest.userData[session.userId]?.profile;
    if (!user || !profile) return latest;
    user.name = name;
    Object.assign(profile, {
      age,
      height,
      targetWeight,
      activity: body.activity || profile.activity,
      diet: body.diet || profile.diet,
      restrictions: String(body.restrictions || ""),
      diabetesStatus: ["none", "borderline", "prediabetes", "diabetes"].includes(body.diabetesStatus) ? body.diabetesStatus : "none",
      hypertension: Boolean(body.hypertension),
      foodAllergies: String(body.foodAllergies || "").slice(0, 500),
      relevantMedications: String(body.relevantMedications || "").slice(0, 500),
      pregnancyStatus: ["none", "pregnant", "breastfeeding"].includes(body.pregnancyStatus) ? body.pregnancyStatus : "none",
      trainingDayBonus: Math.min(600, Math.max(0, Number(body.trainingDayBonus) || 0)),
      targetMode: body.targetMode === "custom" ? "custom" : "automatic",
      avatar,
    });
    const caloriePlan = calculateNutritionTargets(profile);
    profile.caloriePlan = caloriePlan;
    profile.calories = caloriePlan.calories;
    profile.protein = Math.round(Number(profile.weight) * (profile.goal === "gain" ? 1.8 : 1.6));
    profile.carbs = Math.round((caloriePlan.calories * .45) / 4);
    profile.fat = Math.round((caloriePlan.calories * .3) / 9);
    if (profile.targetMode === "custom") {
      profile.calories = Math.min(6000, Math.max(caloriePlan.safetyFloor, Number(body.customCalories) || profile.calories));
      profile.protein = Math.min(400, Math.max(20, Number(body.customProtein) || profile.protein));
      profile.carbs = Math.min(800, Math.max(20, Number(body.customCarbs) || profile.carbs));
      profile.fat = Math.min(250, Math.max(15, Number(body.customFat) || profile.fat));
    }
    profile.targetRanges = { calories: { min: Math.round(profile.calories * .95), max: Math.round(profile.calories * 1.05) }, protein: { min: Math.round(profile.protein * .9), max: Math.round(profile.protein * 1.15) }, carbs: { min: Math.round(profile.carbs * .85), max: Math.round(profile.carbs * 1.15) }, fat: { min: Math.round(profile.fat * .85), max: Math.round(profile.fat * 1.15) } };
    return latest;
  });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
