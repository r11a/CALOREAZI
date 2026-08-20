import { requireUser } from "@/server/auth.js";
import { addAudit, ensureUserData, readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const type = String(body.type || "").trim(); const minutes = Math.max(0, Number(body.minutes) || 0); const steps = Math.max(0, Math.round(Number(body.steps) || 0));
  if (!type || (!minutes && !steps)) return Response.json({ error: "יש להזין סוג פעילות וזמן או צעדים" }, { status: 400 });
  const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); data.activity.push({ id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), time: new Date().toISOString(), type: type.slice(0, 60), minutes, steps, distanceKm: Math.max(0, Number(body.distanceKm) || 0), activeCalories: Math.max(0, Math.round(Number(body.activeCalories) || 0)) }); data.activity = data.activity.slice(-730); addAudit(latest, { userId: session.userId, action: "activity.created", target: type }); return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}

export async function DELETE(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { id } = await request.json();
  const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); const item = data.activity.find((entry) => entry.id === id); if (item) { latest.trash.push({ id: crypto.randomUUID(), userId: session.userId, type: "activity", data: item, deletedAt: new Date().toISOString() }); data.activity = data.activity.filter((entry) => entry.id !== id); addAudit(latest, { userId: session.userId, action: "activity.deleted", target: id }); } return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
