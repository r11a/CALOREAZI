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
  const goal = ["lose", "maintain", "gain", "fitness", "healthy"].includes(body.goal) ? body.goal : "healthy";
  if (!(currentWeight >= 25 && currentWeight <= 350) || !(targetWeight >= 25 && targetWeight <= 350)) return Response.json({ error: "יש להזין משקל נוכחי ומשקל יעד תקינים" }, { status: 400 });
  const state = await updateState((latest) => {
    const data = ensureUserData(latest, session.userId);
    const profile = data.profile;
    profile.cycles = Array.isArray(profile.cycles) ? profile.cycles : [];
    profile.cycles.push({ id: crypto.randomUUID(), startedAt: profile.cycleStartedAt || profile.completedAt, endedAt: new Date().toISOString(), initialWeight: profile.initialWeight, targetWeight: profile.targetWeight, goal: profile.goal });
    const journeyStage = ["starting", "early", "established", "plateau", "returning", "transition"].includes(body.journeyStage) ? body.journeyStage : "starting";
    profile.enrollmentWeight = Number(profile.enrollmentWeight || profile.initialWeight || currentWeight); profile.cycleStartedAt = new Date().toISOString(); profile.cycleInitialWeight = currentWeight; profile.weight = currentWeight; profile.targetWeight = targetWeight; profile.goal = goal;
    profile.journey = { stage: journeyStage, weeksBeforeJoining: journeyStage === "starting" ? 0 : Math.max(0, Math.min(520, Number(body.journeyWeeks) || 0)), startingWeight: journeyStage === "starting" ? null : Math.max(25, Math.min(350, Number(body.journeyStartingWeight) || currentWeight)), recentChangeKg: journeyStage === "starting" ? null : Math.max(-20, Math.min(20, Number(body.journeyRecentChangeKg) || 0)), previousCalorieTarget: journeyStage === "starting" ? null : Math.max(0, Math.min(6000, Number(body.previousCalorieTarget) || 0)), plateauWeeks: journeyStage === "plateau" ? Math.max(1, Math.min(52, Number(body.plateauWeeks) || 1)) : 0, priorApproach: ["calorie_tracking", "meal_plan", "intuitive", "low_carb", "other"].includes(body.priorApproach) ? body.priorApproach : "", mainChallenge: String(body.mainChallenge || "").slice(0, 300), trainingExperience: ["beginner", "intermediate", "advanced", "none"].includes(body.trainingExperience) ? body.trainingExperience : "beginner", preferredPace: ["gentle", "moderate", "focused"].includes(body.preferredPace) ? body.preferredPace : "moderate" };
    profile.workouts = Math.max(0, Math.min(14, Number(body.workouts) || 0)); profile.workoutTypes = [...new Set((Array.isArray(body.workoutTypes) ? body.workoutTypes : []).filter((item) => ["walking", "running", "strength", "cycling", "swimming", "yoga", "other"].includes(item)))];
    const plan = calculateNutritionTargets(profile); profile.caloriePlan = plan; profile.calories = plan.calories;
    data.measurements.push({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), at: new Date().toISOString(), weight: currentWeight, cycleStart: true });
    return latest;
  });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
