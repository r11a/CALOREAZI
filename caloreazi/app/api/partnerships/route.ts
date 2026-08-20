import { requireUser } from "@/server/auth.js";
import { readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const email = String(body.email || "").trim().toLowerCase();
  const partner = state.users.find((user) => String(user.email).toLowerCase() === email && !user.disabled);
  if (!partner || partner.id === session.userId) return Response.json({ error: "לא נמצא משתמש מתאים לשיתוף" }, { status: 404 });
  if ((state.partnerships || []).some((link) => link.ownerId === session.userId && link.partnerId === partner.id && link.status !== "revoked")) return Response.json({ error: "כבר קיימת הזמנה פעילה למשתמש זה" }, { status: 409 });
  const latest = await updateState((draft) => { draft.partnerships = Array.isArray(draft.partnerships) ? draft.partnerships : []; draft.partnerships.push({ id: crypto.randomUUID(), ownerId: session.userId, partnerId: partner.id, status: "pending", permissions: { daily: body.daily !== false || body.meals !== false, meals: body.meals !== false, weight: Boolean(body.weight) }, createdAt: new Date().toISOString() }); return draft; });
  return Response.json(userView(latest, session.userId, session.role === "admin"));
}

export async function PATCH(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const link = (state.partnerships || []).find((item) => item.id === body.id);
  if (!link || (link.ownerId !== session.userId && link.partnerId !== session.userId)) return Response.json({ error: "השיתוף לא נמצא" }, { status: 404 });
  if (body.action === "accept" && link.partnerId !== session.userId) return Response.json({ error: "רק מקבל ההזמנה יכול לאשר" }, { status: 403 });
  const latest = await updateState((draft) => { const current = draft.partnerships.find((item) => item.id === body.id); if (body.action === "accept") current.status = "accepted"; else current.status = "revoked"; current.updatedAt = new Date().toISOString(); return draft; });
  return Response.json(userView(latest, session.userId, session.role === "admin"));
}
