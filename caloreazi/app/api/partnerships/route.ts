import { requireUser } from "@/server/auth.js";
import { readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json();
  const requestedIds = [...new Set((Array.isArray(body.userIds) ? body.userIds : []).map(String))];
  const partners = state.users.filter((user) => requestedIds.includes(user.id) && user.id !== session.userId && !user.disabled);
  if (!partners.length) return Response.json({ error: "יש לבחור לפחות משתמש קיים אחד" }, { status: 404 });
  const latest = await updateState((draft) => { draft.partnerships = Array.isArray(draft.partnerships) ? draft.partnerships : []; for (const partner of partners) { if (draft.partnerships.some((link) => link.ownerId === session.userId && link.partnerId === partner.id && link.status !== "revoked")) continue; draft.partnerships.push({ id: crypto.randomUUID(), ownerId: session.userId, partnerId: partner.id, status: "pending", permissions: { daily: Boolean(body.daily), meals: Boolean(body.meals), weight: Boolean(body.weight), trends: Boolean(body.trends) }, createdAt: new Date().toISOString() }); } return draft; });
  return Response.json(userView(latest, session.userId, session.role === "admin"));
}

export async function PATCH(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const link = (state.partnerships || []).find((item) => item.id === body.id);
  if (!link || (link.ownerId !== session.userId && link.partnerId !== session.userId)) return Response.json({ error: "השיתוף לא נמצא" }, { status: 404 });
  if (body.action === "accept" && link.partnerId !== session.userId) return Response.json({ error: "רק מקבל ההזמנה יכול לאשר" }, { status: 403 });
  const latest = await updateState((draft) => { const current = draft.partnerships.find((item) => item.id === body.id); if (body.action === "accept") current.status = "accepted"; else if (body.action === "reject") current.status = "rejected"; else current.status = "revoked"; current.updatedAt = new Date().toISOString(); return draft; });
  return Response.json(userView(latest, session.userId, session.role === "admin"));
}
