import { requireUser } from "@/server/auth.js";
import { calculateNutritionTargets } from "@/server/nutrition.js";
import { ensureUserData, readState, updateState, userView } from "@/server/store.js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const initial = await readState();
  const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json();
  const currentWeight = Number(body.currentWeight);
  const targetWeight = Number(body.targetWeight);
  const goal = ["lose", "maintain", "gain", "healthy"].includes(body.goal) ? body.goal : "healthy";
  if (!(currentWeight >= 25 && currentWeight <= 350) || !(targetWeight >= 25 && targetWeight <= 350)) return Response.json({ error: "יש להזין משקל נוכחי ומשקל יעד תקינים" }, { status: 400 });
  const state = await updateState((latest) => {
    const data = ensureUserData(latest, session.userId);
    const profile = data.profile;
    profile.cycles = Array.isArray(profile.cycles) ? profile.cycles : [];
    profile.cycles.push({ id: crypto.randomUUID(), startedAt: profile.cycleStartedAt || profile.completedAt, endedAt: new Date().toISOString(), initialWeight: profile.initialWeight, targetWeight: profile.targetWeight, goal: profile.goal });
    profile.enrollmentWeight = Number(profile.enrollmentWeight || profile.initialWeight || currentWeight); profile.cycleStartedAt = new Date().toISOString(); profile.cycleInitialWeight = currentWeight; profile.weight = currentWeight; profile.targetWeight = targetWeight; profile.goal = goal;
    const plan = calculateNutritionTargets(profile); profile.caloriePlan = plan; profile.calories = plan.calories;
    data.measurements.push({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), at: new Date().toISOString(), weight: currentWeight, cycleStart: true });
    return latest;
  });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
