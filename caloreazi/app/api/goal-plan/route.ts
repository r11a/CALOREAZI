import { requireUser } from "@/server/auth.js";
import { evaluateGoalPlan } from "@/server/goal-engine.js";
import { ensureUserData, readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const data = ensureUserData(state, session.userId);
  return Response.json(evaluateGoalPlan({ profile: data.profile, measurements: data.measurements, days: [...data.history, data.today] }));
}

export async function POST(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const before = ensureUserData(initial, session.userId); const plan = evaluateGoalPlan({ profile: before.profile, measurements: before.measurements, days: [...before.history, before.today] });
  if (!plan.proposal) return Response.json({ error: "אין כרגע הצעת התאמה תקפה" }, { status: 409 });
  const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); const profile = data.profile; profile.goalAdjustmentHistory = Array.isArray(profile.goalAdjustmentHistory) ? profile.goalAdjustmentHistory : []; profile.goalAdjustmentHistory.push({ id: crypto.randomUUID(), acceptedAt: new Date().toISOString(), fromCalories: plan.proposal.currentCalories, toCalories: plan.proposal.suggestedCalories, reason: plan.proposal.reason, calibration: plan.calibration.score }); profile.calories = plan.proposal.suggestedCalories; profile.carbs = Math.round(profile.calories * .45 / 4); profile.fat = Math.round(profile.calories * .3 / 9); profile.targetMode = "adaptive"; return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
