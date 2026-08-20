import { clearSessionCookie, createSessionCookie, hashPassword, isAdmin, remoteUser, verifyPassword } from "@/server/auth.js";
import { readState, updateState } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const password = String(body.password || "");
  const state = await readState();
  if (!state.owner) return Response.json({ error: "יש להשלים Onboarding" }, { status: 409 });
  if (password.length < 8) return Response.json({ error: "סיסמת מנהל חייבת להכיל לפחות 8 תווים" }, { status: 400 });

  let admin = state.users.find((item) => item.role === "admin");
  if (!admin?.password?.hash) {
    const ingressUser = remoteUser(request);
    if (state.owner.haUserId && ingressUser?.id !== state.owner.haUserId) return Response.json({ error: "רק בעל החשבון יכול להגדיר סיסמת מנהל" }, { status: 403 });
    const passwordRecord = await hashPassword(password);
    const updated = await updateState((latest) => { const account = latest.users.find((item) => item.role === "admin"); account.password = passwordRecord; latest.adminAuth = passwordRecord; return latest; });
    admin = updated.users.find((item) => item.role === "admin");
  } else if (!(await verifyPassword(password, admin.password))) {
    return Response.json({ error: "סיסמת מנהל שגויה" }, { status: 401 });
  }

  const loggedInAt = new Date().toISOString();
  const sessionId = crypto.randomUUID();
  await updateState((latest) => { const account = latest.users.find((item) => item.id === admin.id); account.lastLogin = loggedInAt; latest.sessions = latest.sessions || []; latest.sessions.push({ id: sessionId, userId: admin.id, createdAt: loggedInAt, lastSeenAt: loggedInAt, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(), userAgent: String(request.headers.get("user-agent") || "").slice(0, 200) }); return latest; });

  return Response.json({ ok: true, role: "admin", rememberedDays: 30 }, { headers: { "Set-Cookie": createSessionCookie(request, admin, sessionId), "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const state = await readState();
  if (!isAdmin(state, request)) return Response.json({ error: "אין session מנהל פעיל" }, { status: 401 });
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
}
