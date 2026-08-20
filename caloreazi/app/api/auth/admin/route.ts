import { clearSessionCookie, createSessionCookie, isAdmin, verifyPassword } from "@/server/auth.js";
import { addAudit, readState, updateState } from "@/server/store.js";
import { checkRateLimit, clientAddress, requireSameOrigin } from "@/server/security.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied;
  const body = await request.json();
  const password = String(body.password || "");
  const state = await readState();
  if (!state.users.some((item) => item.role === "admin")) return Response.json({ error: "יש להשלים Onboarding" }, { status: 409 });
  if (password.length < 10) return Response.json({ error: "סיסמת מנהל חייבת להכיל לפחות 10 תווים" }, { status: 400 });
  const limited = checkRateLimit(`admin-login:${clientAddress(request)}`, { limit: 8, windowMs: 15 * 60_000 }); if (limited) return limited;
  const admin = state.users.find((item) => item.role === "admin" && !item.disabled);
  if (!admin?.password?.hash || (admin.lockedUntil && new Date(admin.lockedUntil).getTime() > Date.now()) || !(await verifyPassword(password, admin.password))) {
    await updateState((latest) => { const account = latest.users.find((item) => item.id === admin?.id); if (account) { account.failedLoginCount = Number(account.failedLoginCount || 0) + 1; if (account.failedLoginCount >= 8) account.lockedUntil = new Date(Date.now() + 15 * 60_000).toISOString(); } addAudit(latest, { userId: admin?.id || null, action: "auth.admin_login_failed", result: "failure", details: clientAddress(request) }); return latest; });
    return Response.json({ error: "סיסמת מנהל שגויה" }, { status: 401 });
  }

  const loggedInAt = new Date().toISOString();
  const sessionId = crypto.randomUUID();
  await updateState((latest) => { const account = latest.users.find((item) => item.id === admin.id); account.lastLogin = loggedInAt; account.failedLoginCount = 0; account.lockedUntil = null; latest.sessions = latest.sessions || []; latest.sessions.push({ id: sessionId, userId: admin.id, createdAt: loggedInAt, lastSeenAt: loggedInAt, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(), userAgent: String(request.headers.get("user-agent") || "").slice(0, 200) }); addAudit(latest, { userId: admin.id, action: "auth.admin_login_succeeded", target: sessionId }); return latest; });

  return Response.json({ ok: true, role: "admin", rememberedDays: 30 }, { headers: { "Set-Cookie": createSessionCookie(request, admin, sessionId), "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const state = await readState();
  if (!isAdmin(state, request)) return Response.json({ error: "אין session מנהל פעיל" }, { status: 401 });
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
}
