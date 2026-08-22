import { createSessionCookie, hashPassword, requireUser, verifyPassword } from "@/server/auth.js";
import { addAudit, readState, updateState } from "@/server/store.js";
export const runtime = "nodejs";

export async function PUT(request: Request) {
  const current = await readState();
  const session = requireUser(current, request);
  if (!session) return Response.json({ error: "יש להתחבר מחדש" }, { status: 401 });
  const body = await request.json();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const user = current.users.find((item) => item.id === session.userId);
  if (!user) return Response.json({ error: "המשתמש לא נמצא" }, { status: 404 });
  if (!(await verifyPassword(currentPassword, user.password))) return Response.json({ error: "הסיסמה הנוכחית שגויה" }, { status: 400 });
  if (newPassword.length < 10) return Response.json({ error: "הסיסמה החדשה חייבת להכיל לפחות 10 תווים" }, { status: 400 });
  if (currentPassword === newPassword) return Response.json({ error: "יש לבחור סיסמה חדשה ושונה" }, { status: 400 });
  const password = await hashPassword(newPassword);
  const newSessionId = crypto.randomUUID();
  const state = await updateState((latest) => {
    const target = latest.users.find((item) => item.id === session.userId);
    target.password = password;
    target.sessionVersion = Number(target.sessionVersion || 1) + 1;
    latest.sessions = (latest.sessions || []).map((item) => item.userId === target.id ? { ...item, revokedAt: new Date().toISOString() } : item);
    latest.sessions.push({ id: newSessionId, userId: target.id, createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(), userAgent: String(request.headers.get("user-agent") || "").slice(0, 200) });
    addAudit(latest, { userId: target.id, action: "auth.password_changed", target: target.id });
    return latest;
  });
  const updated = state.users.find((item) => item.id === session.userId);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": createSessionCookie(request, updated, newSessionId), "Cache-Control": "no-store" } });
}
