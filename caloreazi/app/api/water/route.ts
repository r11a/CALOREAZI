import { requireUser } from "@/server/auth.js";
import { ensureUserData, readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const initial = await readState();
  const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { amount = 250 } = await request.json();
  const state = await updateState((latest) => { const today = ensureUserData(latest, session.userId).today; today.waterMl = Math.max(0, Number(today.waterMl || 0) + Number(amount || 0)); return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
export async function PUT(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { amount, targetWaterMl } = await request.json(); const waterMl = Math.max(0, Math.min(20_000, Math.round(Number(amount) || 0))); const dailyTarget = Math.max(1500, Math.min(2750, Math.round(Number(targetWaterMl) || 2000)));
  const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); data.today.waterMl = waterMl; data.profile.waterMl = dailyTarget; return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
