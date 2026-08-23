import { requireUser } from "@/server/auth.js";
import { ensureUserData, readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const initial = await readState();
  const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const mutationKey = String(request.headers.get("idempotency-key") || "").slice(0, 120); const receipt = `${session.userId}:water:post:${mutationKey}`;
  if (mutationKey && (initial.systemSettings?.mutationReceipts || []).includes(receipt)) return Response.json(userView(initial, session.userId, session.role === "admin"));
  const { amount = 250, recordedAt, localDate } = await request.json(); const eventTime = Number.isFinite(Date.parse(String(recordedAt || ""))) ? new Date(recordedAt).toISOString() : new Date().toISOString(); const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(String(localDate || "")) ? String(localDate) : eventTime.slice(0, 10);
  const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); const day = data.today.date === eventDate ? data.today : data.history.find((item) => item.date === eventDate); if (!day) return latest; const delta = Number(amount || 0); day.waterMl = Math.max(0, Number(day.waterMl || 0) + delta); day.waterEvents = Array.isArray(day.waterEvents) ? day.waterEvents : []; if (delta > 0) day.waterEvents.push({ id: crypto.randomUUID(), amount: delta, time: eventTime }); else if (delta < 0) { let remaining = Math.abs(delta); while (remaining > 0 && day.waterEvents.length) { const last = day.waterEvents.at(-1); if (Number(last.amount) <= remaining) { remaining -= Number(last.amount); day.waterEvents.pop(); } else { last.amount = Number(last.amount) - remaining; remaining = 0; } } } if (mutationKey) { latest.systemSettings.mutationReceipts = [...(latest.systemSettings.mutationReceipts || []), receipt].slice(-2000); } return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
export async function PUT(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { amount, targetWaterMl, localDate } = await request.json(); const waterMl = Math.max(0, Math.min(20_000, Math.round(Number(amount) || 0))); const dailyTarget = Math.max(1500, Math.min(2750, Math.round(Number(targetWaterMl) || 2000)));
  const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); const editDate = /^\d{4}-\d{2}-\d{2}$/.test(String(localDate || "")) ? String(localDate) : data.today.date; const day = data.today.date === editDate ? data.today : data.history.find((item) => item.date === editDate); if (day) { day.waterMl = waterMl; day.waterEvents = Array.isArray(day.waterEvents) ? day.waterEvents : []; } data.profile.waterMl = dailyTarget; return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
