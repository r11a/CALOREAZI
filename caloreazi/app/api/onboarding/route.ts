import { createSessionCookie, currentSession, hashPassword, requireUser } from "@/server/auth.js";
import { calculateNutritionTargets } from "@/server/nutrition.js";
import { readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const weight = Number(body.weight), height = Number(body.height), age = Number(body.age);
  if (!name) return Response.json({ error: "יש להזין שם" }, { status: 400 });
  if (!(weight > 25 && height > 100 && age > 13)) return Response.json({ error: "יש לבדוק גיל, גובה ומשקל" }, { status: 400 });

  const initial = await readState();
  let session = currentSession(request);
  let newAdmin = null;
  if (initial.users.length === 0) {
    const password = String(body.adminPassword || "");
    if (!email.includes("@") || password.length < 8) return Response.json({ error: "נדרשים אימייל וסיסמת Admin בת 8 תווים לפחות" }, { status: 400 });
    newAdmin = { id: crypto.randomUUID(), name, email, username: email, role: "admin", password: await hashPassword(password), createdAt: new Date().toISOString() };
    session = { userId: newAdmin.id, role: "admin" };
  } else session = requireUser(initial, request);
  if (!session || (initial.users.length > 0 && !initial.users.some((item) => item.id === session.userId))) return Response.json({ error: "יש להתחבר לפני השלמת Onboarding" }, { status: 401 });

  const caloriePlan = calculateNutritionTargets(body);
  const calories = caloriePlan.calories;
  const profile = { goal: body.goal, sex: body.sex, age, height, weight, targetWeight: Number(body.targetWeight) || weight, activity: body.activity, workouts: Number(body.workouts) || 0, diet: body.diet || "none", restrictions: String(body.restrictions || ""), calories, caloriePlan, protein: Math.round(weight * (body.goal === "gain" ? 1.8 : 1.6)), carbs: Math.round((calories * .45) / 4), fat: Math.round((calories * .3) / 9), waterMl: Math.round(weight * 32 / 250) * 250, completedAt: new Date().toISOString() };
  const state = await updateState((latest) => {
    if (newAdmin) { latest.users.push(newAdmin); latest.owner = { ...newAdmin, password: undefined }; latest.adminAuth = newAdmin.password; }
    latest.userData[session.userId] = { profile, today: { date: new Date().toISOString().slice(0, 10), waterMl: 0, meals: [] } };
    return latest;
  });
  const user = state.users.find((item) => item.id === session.userId);
  return Response.json({ authenticated: true, ...userView(state, session.userId, session.role === "admin") }, newAdmin ? { headers: { "Set-Cookie": createSessionCookie(request, user) } } : undefined);
}
