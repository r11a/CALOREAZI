import { clearSessionCookie, createSessionCookie, verifyPassword } from "@/server/auth.js";
import { readState } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const login = String(body.login || "").trim().toLowerCase();
  const state = await readState();
  const user = state.users.find((item) => item.email?.toLowerCase() === login || item.username?.toLowerCase() === login);
  if (!user || !(await verifyPassword(String(body.password || ""), user.password))) return Response.json({ error: "שם המשתמש או הסיסמה שגויים" }, { status: 401 });
  return Response.json({ ok: true }, { headers: { "Set-Cookie": createSessionCookie(request, user), "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) { return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(request) } }); }
