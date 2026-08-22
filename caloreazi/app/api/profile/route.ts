import { requireUser, verifyPassword } from "@/server/auth.js";
import { calculateNutritionTargets } from "@/server/nutrition.js";
import { readState, updateState, userView } from "@/server/store.js";
import { validTimeZone } from "@/server/local-date.js";
import { normalizeNotificationPreferences } from "@/server/notification-preferences.js";

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
  const tasteProfile = body.tasteProfile && typeof body.tasteProfile === "object" ? { likes: [...new Set((Array.isArray(body.tasteProfile.likes) ? body.tasteProfile.likes : []).map((item) => String(item).slice(0, 40)))].slice(0, 30), dislikes: [...new Set((Array.isArray(body.tasteProfile.dislikes) ? body.tasteProfile.dislikes : []).map((item) => String(item).slice(0, 40)))].slice(0, 30), prepTime: ["quick", "medium", "long"].includes(body.tasteProfile.prepTime) ? body.tasteProfile.prepTime : "medium", completedAt: body.tasteProfile.completedAt || null } : undefined;
  if (name.length < 2) return Response.json({ error: "יש להזין שם תקין" }, { status: 400 });
  if (!(age >= 14 && age <= 120) || !(height >= 100 && height <= 250)) return Response.json({ error: "יש לבדוק גיל וגובה" }, { status: 400 });
  if (!(targetWeight >= 25 && targetWeight <= 350)) return Response.json({ error: "יש להזין משקל יעד תקין" }, { status: 400 });
  if (avatar && (!avatar.startsWith("data:image/jpeg;base64,") || avatar.length > 700_000)) return Response.json({ error: "תמונת הפרופיל אינה תקינה או גדולה מדי" }, { status: 400 });
  const existingUser = initial.users.find((item) => item.id === session.userId);
  const existingProfile = initial.userData[session.userId]?.profile;
  const requestedEmail = String(body.email || existingUser?.email || "").trim().toLowerCase();
  const changesEmail = Boolean(existingUser && requestedEmail !== String(existingUser.email || "").toLowerCase());
  if (changesEmail && !/^\S+@\S+\.\S+$/.test(requestedEmail)) return Response.json({ error: "יש להזין כתובת אימייל תקינה" }, { status: 400 });
  if (changesEmail && initial.users.some((item) => item.id !== session.userId && String(item.email || "").toLowerCase() === requestedEmail)) return Response.json({ error: "כתובת האימייל כבר משויכת למשתמש אחר" }, { status: 409 });
  if (changesEmail && (!existingUser || !(await verifyPassword(String(body.accountPassword || ""), existingUser.password)))) return Response.json({ error: "נדרשת הסיסמה הנוכחית כדי לשנות אימייל" }, { status: 403 });
  const requestedInitialWeight = Number(body.initialWeight);
  const changesInitialWeight = Number(existingProfile?.initialWeight) > 0 && requestedInitialWeight >= 25 && requestedInitialWeight <= 350 && requestedInitialWeight !== Number(existingProfile.initialWeight);
  if (changesInitialWeight && (!existingUser || !(await verifyPassword(String(body.initialWeightPassword || ""), existingUser.password)))) return Response.json({ error: "נדרשת הסיסמה הנוכחית כדי לשנות את המשקל ההתחלתי" }, { status: 403 });

  const state = await updateState((latest) => {
    const user = latest.users.find((item) => item.id === session.userId);
    const profile = latest.userData[session.userId]?.profile;
    if (!user || !profile) return latest;
    user.name = name;
    if (changesEmail) user.email = requestedEmail;
    Object.assign(profile, {
      age,
      height,
      targetWeight,
      activity: body.activity || profile.activity,
      diet: body.diet || profile.diet,
      workoutTypes: [...new Set((Array.isArray(body.workoutTypes) ? body.workoutTypes : []).filter((item) => ["walking", "running", "strength", "cycling", "swimming", "yoga", "other"].includes(item)))],
      restrictions: String(body.restrictions || ""),
      diabetesStatus: ["none", "borderline", "prediabetes", "diabetes"].includes(body.diabetesStatus) ? body.diabetesStatus : "none",
      hypertension: Boolean(body.hypertension),
      foodAllergies: String(body.foodAllergies || "").slice(0, 500),
      relevantMedications: String(body.relevantMedications || "").slice(0, 500),
      pregnancyStatus: ["none", "pregnant", "breastfeeding"].includes(body.pregnancyStatus) ? body.pregnancyStatus : "none",
      timeZone: validTimeZone(body.timeZone || profile.timeZone),
      trainingDayBonus: Math.min(600, Math.max(0, Number(body.trainingDayBonus) || 0)),
      targetMode: body.targetMode === "custom" ? "custom" : "automatic",
      tasteProfile: tasteProfile || profile.tasteProfile,
      acquaintance: body.acquaintance && typeof body.acquaintance === "object" ? { bloodType: String(body.acquaintance.bloodType || "").slice(0, 5), occupation: String(body.acquaintance.occupation || "").slice(0, 120), sleepHours: Math.max(0, Math.min(16, Number(body.acquaintance.sleepHours) || 0)), stressLevel: Math.max(0, Math.min(10, Number(body.acquaintance.stressLevel) || 0)), motivation: String(body.acquaintance.motivation || "").slice(0, 500), eatingChallenges: String(body.acquaintance.eatingChallenges || "").slice(0, 500), completedAt: new Date().toISOString() } : profile.acquaintance,
      notificationPreferences: normalizeNotificationPreferences(body.notificationPreferences || profile.notificationPreferences),
      avatar,
    });
    const initialWeight = Number(body.initialWeight);
    if (initialWeight >= 25 && initialWeight <= 350) profile.initialWeight = initialWeight;
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
