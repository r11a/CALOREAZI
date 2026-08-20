import { hashPassword, requireAdmin } from "@/server/auth.js";
import { readState, updateState } from "@/server/store.js";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const state = await readState();
  const denied = requireAdmin(state, request);
  if (denied) return denied;
  return Response.json(state.users.map(({ password, ...user }) => ({ ...user, passwordConfigured: Boolean(password?.hash) })));
}

export async function POST(request: Request) {
  const state = await readState();
  const denied = requireAdmin(state, request);
  if (denied) return denied;
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  if (!name || !email.includes("@") || password.length < 8) return Response.json({ error: "נדרשים שם, אימייל תקין וסיסמה בת 8 תווים לפחות" }, { status: 400 });
  if (state.users.some((item) => item.email?.toLowerCase() === email)) return Response.json({ error: "האימייל כבר קיים" }, { status: 409 });
  const user = { id: crypto.randomUUID(), name, email, username: email, role: "user", password: await hashPassword(password), createdAt: new Date().toISOString() };
  await updateState((latest) => { latest.users.push(user); latest.userData[user.id] = { profile: null, today: { date: "", waterMl: 0, meals: [] } }; return latest; });
  return Response.json({ id: user.id, name: user.name, email: user.email, username: user.username, role: user.role, createdAt: user.createdAt }, { status: 201 });
}
