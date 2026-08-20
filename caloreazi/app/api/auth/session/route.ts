import { clearSessionCookie, createSessionCookie, currentSession, verifyPassword } from "@/server/auth.js";
import { addAudit, readState, updateState } from "@/server/store.js";
import { checkRateLimit, clientAddress, requireSameOrigin } from "@/server/security.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied;
  const body = await request.json();
  const login = String(body.login || "").trim().toLowerCase();
  const limited = checkRateLimit(`login:${clientAddress(request)}:${login}`, { limit: 8, windowMs: 15 * 60_000 }); if (limited) return limited;
  const state = await readState();
  const user = state.users.find((item) => item.email?.toLowerCase() === login || item.username?.toLowerCase() === login);
  if (user?.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) return Response.json({ error: "החשבון נעול זמנית עקב ניסיונות התחברות כושלים" }, { status: 423 });
  if (!user || user.disabled === true || !(await verifyPassword(String(body.password || ""), user.password))) { await updateState((latest) => { const target = latest.users.find((item) => item.id === user?.id); if (target) { target.failedLoginCount = Number(target.failedLoginCount || 0) + 1; if (target.failedLoginCount >= 8) target.lockedUntil = new Date(Date.now() + 15 * 60_000).toISOString(); } addAudit(latest, { userId: user?.id || null, action: "auth.login_failed", target: login, result: "failure", details: clientAddress(request) }); return latest; }); return Response.json({ error: "שם המשתמש או הסיסמה שגויים" }, { status: 401 }); }
  const loggedInAt = new Date().toISOString();
  const sessionId = crypto.randomUUID(); const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
  await updateState((latest) => { const target = latest.users.find((item) => item.id === user.id); target.lastLogin = loggedInAt; target.failedLoginCount = 0; target.lockedUntil = null; latest.sessions = (latest.sessions || []).filter((item) => new Date(item.expiresAt).getTime() > Date.now() && !item.revokedAt); latest.sessions.push({ id: sessionId, userId: user.id, createdAt: loggedInAt, lastSeenAt: loggedInAt, expiresAt, userAgent: String(request.headers.get("user-agent") || "").slice(0, 200), ip: clientAddress(request) }); addAudit(latest, { userId: user.id, action: "auth.login_succeeded", target: sessionId }); return latest; });
  return Response.json({ ok: true, rememberedDays: 30 }, { headers: { "Set-Cookie": createSessionCookie(request, user, sessionId), "Cache-Control": "no-store" } });
}

export async function GET(request: Request) { const state = await readState(); const session = currentSession(request); const user = state.users.find((item) => item.id === session?.userId); if (!user) return Response.json({ error: "יש להתחבר" }, { status: 401 }); return Response.json({ sessions: (state.sessions || []).filter((item) => item.userId === user.id && !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now()).map((item) => ({ ...item, current: item.id === session.sid })) }); }
export async function PATCH(request: Request) { const denied = requireSameOrigin(request); if (denied) return denied; const state = await readState(); const session = currentSession(request); const user = state.users.find((item) => item.id === session?.userId); if (!user) return Response.json({ error: "יש להתחבר" }, { status: 401 }); const body = await request.json(); await updateState((latest) => { latest.sessions = (latest.sessions || []).map((item) => item.userId === user.id && (body.all === true || item.id === body.id) ? { ...item, revokedAt: new Date().toISOString() } : item); addAudit(latest, { userId: user.id, action: body.all === true ? "auth.sessions_revoked_all" : "auth.session_revoked", target: body.id || "all" }); return latest; }); const currentRevoked = body.all === true || body.id === session.sid; return Response.json({ ok: true }, { headers: currentRevoked ? { "Set-Cookie": clearSessionCookie(request) } : undefined }); }
export async function DELETE(request: Request) { const session = currentSession(request); if (session?.sid) await updateState((latest) => { const item = latest.sessions?.find((entry) => entry.id === session.sid && entry.userId === session.userId); if (item) item.revokedAt = new Date().toISOString(); return latest; }); return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(request) } }); }
