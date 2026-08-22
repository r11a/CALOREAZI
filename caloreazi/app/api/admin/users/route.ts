import { currentSession, hashPassword, requireAdmin } from "@/server/auth.js";
import { addAudit, readState, updateState } from "@/server/store.js";
import { requireSameOrigin } from "@/server/security.js";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const state = await readState();
  const denied = requireAdmin(state, request);
  if (denied) return denied;
  return Response.json(state.users.map(({ password, ...user }) => { const profile = state.userData?.[user.id]?.profile; return ({ ...user, passwordConfigured: Boolean(password?.hash), activeSessions: (state.sessions || []).filter((session) => session.userId === user.id && !session.revokedAt && new Date(session.expiresAt).getTime() > Date.now()).length, healthSummary: profile ? { diabetesStatus: profile.diabetesStatus || "none", hypertension: Boolean(profile.hypertension), allergies: Boolean(profile.foodAllergies), pregnancyStatus: profile.pregnancyStatus || "none" } : null }); }));
}

export async function POST(request: Request) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied;
  const state = await readState();
  const denied = requireAdmin(state, request);
  if (denied) return denied;
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  if (!name || !email.includes("@") || password.length < 10) return Response.json({ error: "נדרשים שם, אימייל תקין וסיסמה בת 10 תווים לפחות" }, { status: 400 });
  if (state.users.some((item) => item.email?.toLowerCase() === email)) return Response.json({ error: "האימייל כבר קיים" }, { status: 409 });
  const user = { id: crypto.randomUUID(), name, email, username: email, role: "member", password: await hashPassword(password), sessionVersion: 1, createdAt: new Date().toISOString() };
  await updateState((latest) => { latest.users.push(user); latest.userData[user.id] = { profile: null, today: { date: "", waterMl: 0, meals: [] } }; addAudit(latest, { userId: currentSession(request)?.userId, action: "user.created", target: user.id, details: email }); return latest; });
  return Response.json({ id: user.id, name: user.name, email: user.email, username: user.username, role: user.role, createdAt: user.createdAt }, { status: 201 });
}

export async function PATCH(request: Request) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied;
  const state = await readState(); const denied = requireAdmin(state, request); if (denied) return denied;
  const body = await request.json(); const target = state.users.find((item) => item.id === body.id);
  if (!target) return Response.json({ error: "המשתמש לא נמצא" }, { status: 404 });
  if (target.role === "admin" && body.disabled === true) return Response.json({ error: "לא ניתן להשבית את חשבון המנהל הראשי" }, { status: 400 });
  const requestedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const requestedPassword = String(body.password || "");
  if (requestedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) return Response.json({ error: "כתובת האימייל אינה תקינה" }, { status: 400 });
  if (requestedEmail && state.users.some((item) => item.id !== target.id && item.email?.toLowerCase() === requestedEmail)) return Response.json({ error: "האימייל כבר משויך למשתמש אחר" }, { status: 409 });
  if (requestedPassword && requestedPassword.length < 10) return Response.json({ error: "סיסמה חדשה חייבת להכיל לפחות 10 תווים" }, { status: 400 });
  await updateState(async (latest) => { const user = latest.users.find((item) => item.id === body.id); if (typeof body.disabled === "boolean") { user.disabled = body.disabled; user.sessionVersion = Number(user.sessionVersion || 1) + 1; addAudit(latest, { userId: currentSession(request)?.userId, action: body.disabled ? "user.disabled" : "user.enabled", target: user.id }); } if (requestedEmail && requestedEmail !== String(user.email || "").toLowerCase()) { const oldEmail = String(user.email || "").toLowerCase(); user.email = requestedEmail; user.sessionVersion = Number(user.sessionVersion || 1) + 1; addAudit(latest, { userId: currentSession(request)?.userId, action: "user.email_changed", target: user.id, details: `${oldEmail} -> ${requestedEmail}` }); } if (requestedPassword.length >= 10) { user.password = await hashPassword(requestedPassword); user.sessionVersion = Number(user.sessionVersion || 1) + 1; addAudit(latest, { userId: currentSession(request)?.userId, action: "user.password_reset", target: user.id }); } if (["admin", "member"].includes(body.role) && user.role !== body.role) { user.role = body.role; user.sessionVersion = Number(user.sessionVersion || 1) + 1; addAudit(latest, { userId: currentSession(request)?.userId, action: "user.role_changed", target: user.id, details: body.role }); } latest.sessions = (latest.sessions || []).map((session) => session.userId === user.id && Number(user.sessionVersion || 1) > Number(target.sessionVersion || 1) ? { ...session, revokedAt: new Date().toISOString() } : session); return latest; });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied;
  const state = await readState(); const denied = requireAdmin(state, request); if (denied) return denied; const { id } = await request.json(); const target = state.users.find((item) => item.id === id);
  if (!target) return Response.json({ error: "המשתמש לא נמצא" }, { status: 404 });
  if (target.role === "admin") return Response.json({ error: "לא ניתן למחוק חשבון מנהל" }, { status: 400 });
  await updateState((latest) => { latest.users = latest.users.filter((item) => item.id !== id); delete latest.userData[id]; latest.sessions = (latest.sessions || []).filter((item) => item.userId !== id); latest.partnerships = (latest.partnerships || []).filter((item) => item.ownerId !== id && item.partnerId !== id); latest.trash = (latest.trash || []).filter((item) => item.userId !== id); latest.analysisJobs = (latest.analysisJobs || []).filter((item) => item.userId !== id); addAudit(latest, { userId: currentSession(request)?.userId, action: "user.deleted", target: id }); return latest; });
  return Response.json({ ok: true });
}
