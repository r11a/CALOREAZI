import { createSessionCookie, currentSession, hashPassword, remoteUser, requireUser } from "@/server/auth.js";
import { ageFromBirthDate, calculateNutritionTargets } from "@/server/nutrition.js";
import { readState, updateState, userView } from "@/server/store.js";
import { localDateAt, validTimeZone } from "@/server/local-date.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const weight = Number(body.weight), height = Number(body.height), birthDate = String(body.birthDate || ""), age = ageFromBirthDate(birthDate) ?? Number(body.age);
  if (!name) return Response.json({ error: "יש להזין שם" }, { status: 400 });
  if (!birthDate || ageFromBirthDate(birthDate) === null) return Response.json({ error: "יש לבחור תאריך לידה תקין" }, { status: 400 });
  if (!(weight > 25 && height > 100 && age > 13)) return Response.json({ error: "יש לבדוק גיל, גובה ומשקל" }, { status: 400 });

  const initial = await readState();
  let session = currentSession(request);
  let newAdmin = null;
  const newSessionId = crypto.randomUUID();
  if (initial.users.length === 0) {
    const password = String(body.adminPassword || "");
    if (!email.includes("@") || password.length < 10) return Response.json({ error: "נדרשים אימייל וסיסמת Admin בת 10 תווים לפחות" }, { status: 400 });
    const ingressUser = remoteUser(request);
    newAdmin = { id: crypto.randomUUID(), name, email, username: email, role: "admin", haUserId: ingressUser?.id || null, password: await hashPassword(password), createdAt: new Date().toISOString() };
    session = { userId: newAdmin.id, role: "admin" };
  } else session = requireUser(initial, request);
  if (!session || (initial.users.length > 0 && !initial.users.some((item) => item.id === session.userId))) return Response.json({ error: "יש להתחבר לפני השלמת Onboarding" }, { status: 401 });

  const caloriePlan = calculateNutritionTargets({ ...body, age });
  const calories = caloriePlan.calories;
  const timeZone = validTimeZone(body.timeZone);
  const workoutTypes = [...new Set((Array.isArray(body.workoutTypes) ? body.workoutTypes : []).filter((item) => ["walking", "running", "strength", "cycling", "swimming", "yoga", "other"].includes(item)))];
  const journeyStage = ["starting", "early", "established", "plateau", "returning", "transition"].includes(body.journeyStage) ? body.journeyStage : "starting";
  const profile = { timeZone, goal: body.goal, sex: body.sex, birthDate, age, height, weight, initialWeight: weight, targetWeight: Number(body.targetWeight) || weight, activity: body.activity, workouts: Number(body.workouts) || 0, workoutTypes, diet: body.diet || "none", restrictions: String(body.restrictions || ""), journey: { stage: journeyStage, weeksBeforeJoining: journeyStage === "starting" ? 0 : Math.max(0, Math.min(520, Number(body.journeyWeeks) || 0)), startingWeight: journeyStage === "starting" ? null : Math.max(25, Math.min(350, Number(body.journeyStartingWeight) || weight)), recentChangeKg: journeyStage === "starting" ? null : Math.max(-20, Math.min(20, Number(body.journeyRecentChangeKg) || 0)), previousCalorieTarget: journeyStage === "starting" ? null : Math.max(0, Math.min(6000, Number(body.previousCalorieTarget) || 0)), plateauWeeks: journeyStage === "plateau" ? Math.max(1, Math.min(52, Number(body.plateauWeeks) || 1)) : 0, priorApproach: ["calorie_tracking", "meal_plan", "intuitive", "low_carb", "other"].includes(body.priorApproach) ? body.priorApproach : "", mainChallenge: String(body.mainChallenge || "").slice(0, 300), trainingExperience: ["beginner", "intermediate", "advanced", "none"].includes(body.trainingExperience) ? body.trainingExperience : "beginner", preferredPace: ["gentle", "moderate", "focused"].includes(body.preferredPace) ? body.preferredPace : "moderate" }, calories, caloriePlan, protein: Math.round(weight * (body.goal === "gain" ? 1.8 : 1.6)), carbs: Math.round((calories * .45) / 4), fat: Math.round((calories * .3) / 9), waterMl: Math.round(weight * 32 / 250) * 250, completedAt: new Date().toISOString() };
  const state = await updateState((latest) => {
    if (newAdmin) { latest.users.push(newAdmin); latest.owner = { ...newAdmin, password: undefined }; latest.adminAuth = newAdmin.password; latest.sessions = latest.sessions || []; latest.sessions.push({ id: newSessionId, userId: newAdmin.id, createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(), userAgent: String(request.headers.get("user-agent") || "").slice(0, 200) }); }
    latest.userData[session.userId] = { profile, today: { date: localDateAt(new Date(), timeZone), waterMl: 0, meals: [] } };
    return latest;
  });
  const user = state.users.find((item) => item.id === session.userId);
  return Response.json({ authenticated: true, ...userView(state, session.userId, session.role === "admin") }, newAdmin ? { headers: { "Set-Cookie": createSessionCookie(request, user, newSessionId) } } : undefined);
}
