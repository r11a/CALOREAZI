import { createSessionCookie, hashPassword, requireUser, verifyPassword } from "@/server/auth.js";
import { readState, updateState } from "@/server/store.js";
export const runtime = "nodejs";

export async function PUT(request: Request) {
  const current = await readState();
  const session = requireUser(current, request);
  if (!session) return Response.json({ error: "יש להתחבר מחדש" }, { status: 401 });
  const body = await request.json();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const user = current.users.find((item) => item.id === session.userId);
  if (user?.role !== "admin") return Response.json({ error: "הפעולה זמינה למנהל בלבד" }, { status: 403 });
  if (!(await verifyPassword(currentPassword, user.password))) return Response.json({ error: "הסיסמה הנוכחית שגויה" }, { status: 400 });
  if (newPassword.length < 10) return Response.json({ error: "הסיסמה החדשה חייבת להכיל לפחות 10 תווים" }, { status: 400 });
  if (currentPassword === newPassword) return Response.json({ error: "יש לבחור סיסמה חדשה ושונה" }, { status: 400 });
  const password = await hashPassword(newPassword);
  const state = await updateState((latest) => {
    const target = latest.users.find((item) => item.id === session.userId);
    target.password = password;
    target.sessionVersion = Number(target.sessionVersion || 1) + 1;
    return latest;
  });
  const updated = state.users.find((item) => item.id === session.userId);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": createSessionCookie(request, updated), "Cache-Control": "no-store" } });
}
