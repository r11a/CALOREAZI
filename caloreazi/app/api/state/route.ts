import { createSessionCookie, remoteUser, requireUser } from "@/server/auth.js";
import { readState, updateState, userView } from "@/server/store.js";
import { calculateNutritionTargets } from "@/server/nutrition.js";
import { localDateAt, userTimeZone } from "@/server/local-date.js";
export const runtime = "nodejs";
export async function GET(request: Request) {
  let state = await readState();
  if (state.users.length === 0) return Response.json({ authenticated: false, bootstrapRequired: true }, { headers: { "Cache-Control": "no-store" } });
  let session = requireUser(state, request); let ingressCookie = "";
  if (!session) { const ingress = remoteUser(request); const user = ingress && state.users.find((item) => item.haUserId === ingress.id && !item.disabled); if (user) { const sid = crypto.randomUUID(); const createdAt = new Date().toISOString(); state = await updateState((latest) => { latest.sessions.push({ id: sid, userId: user.id, createdAt, lastSeenAt: createdAt, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), userAgent: "Home Assistant Ingress" }); return latest; }); session = { sid, userId: user.id, role: user.role, sessionVersion: Number(user.sessionVersion || 1) }; ingressCookie = createSessionCookie(request, user, sid); } }
  if (!session) return Response.json({ authenticated: false, bootstrapRequired: false, adminConfigured: state.users.some((item) => item.role === "admin" && item.password?.hash) }, { headers: { "Cache-Control": "no-store" } });
  const currentData = state.userData[session.userId];
  if (currentData?.today?.date !== localDateAt(new Date(), userTimeZone(currentData)))
    state = await updateState((latest) => { userView(latest, session.userId, session.role === "admin"); return latest; });
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
  return Response.json({ authenticated: true, ...userView(state, session.userId, session.role === "admin") }, { headers: { "Cache-Control": "no-store", ...(ingressCookie ? { "Set-Cookie": ingressCookie } : {}) } });
}
