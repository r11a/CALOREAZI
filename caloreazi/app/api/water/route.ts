import { requireUser } from "@/server/auth.js";
import { ensureUserData, readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const initial = await readState();
  const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const mutationKey = String(request.headers.get("idempotency-key") || "").slice(0, 120); const receipt = `${session.userId}:water:post:${mutationKey}`;
  if (mutationKey && (initial.systemSettings?.mutationReceipts || []).includes(receipt)) return Response.json(userView(initial, session.userId, session.role === "admin"));
  const { amount = 250 } = await request.json();
  const state = await updateState((latest) => { const today = ensureUserData(latest, session.userId).today; const delta = Number(amount || 0); today.waterMl = Math.max(0, Number(today.waterMl || 0) + delta); today.waterEvents = Array.isArray(today.waterEvents) ? today.waterEvents : []; if (delta > 0) today.waterEvents.push({ id: crypto.randomUUID(), amount: delta, time: new Date().toISOString() }); else if (delta < 0) { let remaining = Math.abs(delta); while (remaining > 0 && today.waterEvents.length) { const last = today.waterEvents.at(-1); if (Number(last.amount) <= remaining) { remaining -= Number(last.amount); today.waterEvents.pop(); } else { last.amount = Number(last.amount) - remaining; remaining = 0; } } } if (mutationKey) { latest.systemSettings.mutationReceipts = [...(latest.systemSettings.mutationReceipts || []), receipt].slice(-2000); } return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
export async function PUT(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { amount, targetWaterMl } = await request.json(); const waterMl = Math.max(0, Math.min(20_000, Math.round(Number(amount) || 0))); const dailyTarget = Math.max(1500, Math.min(2750, Math.round(Number(targetWaterMl) || 2000)));
  const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); data.today.waterMl = waterMl; data.today.waterEvents = Array.isArray(data.today.waterEvents) ? data.today.waterEvents : []; data.profile.waterMl = dailyTarget; return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
