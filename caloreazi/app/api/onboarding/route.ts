import { publicState, updateState } from "@/server/store.js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.json();
  if (!String(body.name || "").trim()) return Response.json({ error: "יש להזין שם" }, { status: 400 });
  const weight = Number(body.weight), height = Number(body.height), age = Number(body.age);
  if (!(weight > 25 && height > 100 && age > 13)) return Response.json({ error: "יש לבדוק גיל, גובה ומשקל" }, { status: 400 });
  const sexFactor = body.sex === "female" ? -161 : 5;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexFactor;
  const activity = ({ low: 1.2, light: 1.375, active: 1.55, very: 1.725 } as Record<string, number>)[body.activity] || 1.375;
  const adjustment = body.goal === "lose" ? -400 : body.goal === "gain" ? 300 : 0;
  const calories = Math.max(1200, Math.round((bmr * activity + adjustment) / 50) * 50);
  const protein = Math.round(weight * (body.goal === "gain" ? 1.8 : 1.6));
  const state = await updateState((state) => {
    state.owner = { id: crypto.randomUUID(), name: String(body.name).trim(), email: String(body.email || "").trim(), role: "admin", createdAt: new Date().toISOString() };
    state.profile = { goal: body.goal, sex: body.sex, age, height, weight, targetWeight: Number(body.targetWeight) || weight, activity: body.activity, workouts: Number(body.workouts) || 0, diet: body.diet || "none", restrictions: String(body.restrictions || ""), calories, protein, carbs: Math.round((calories * .45) / 4), fat: Math.round((calories * .3) / 9), waterMl: Math.round(weight * 32 / 250) * 250, completedAt: new Date().toISOString() };
    state.today = { date: new Date().toISOString().slice(0, 10), waterMl: 0, meals: [] };
    return state;
  });
  return Response.json(publicState(state));
}
