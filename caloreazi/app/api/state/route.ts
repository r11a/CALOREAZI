import { requireUser } from "@/server/auth.js";
import { readState, updateState, userView } from "@/server/store.js";
import { calculateNutritionTargets } from "@/server/nutrition.js";
export const runtime = "nodejs";
export async function GET(request: Request) {
  let state = await readState();
  if (state.users.length === 0) return Response.json({ authenticated: false, bootstrapRequired: true }, { headers: { "Cache-Control": "no-store" } });
  const session = requireUser(state, request);
  if (!session) return Response.json({ authenticated: false, bootstrapRequired: false, adminConfigured: state.users.some((item) => item.role === "admin" && item.password?.hash) }, { headers: { "Cache-Control": "no-store" } });
  const data = state.userData[session.userId];
  if (data?.profile && !data.profile.caloriePlan) {
    state = await updateState((latest) => {
      const profile = latest.userData[session.userId].profile;
      const caloriePlan = calculateNutritionTargets(profile);
      profile.caloriePlan = caloriePlan;
      profile.calories = caloriePlan.calories;
      profile.carbs = Math.round((caloriePlan.calories * .45) / 4);
      profile.fat = Math.round((caloriePlan.calories * .3) / 9);
      return latest;
    });
  }
  return Response.json({ authenticated: true, ...userView(state, session.userId, session.role === "admin") }, { headers: { "Cache-Control": "no-store" } });
}
