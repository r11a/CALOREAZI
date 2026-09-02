import { requireUser, verifyPassword } from "@/server/auth.js";
import { addAudit, ensureUserData, readState, updateState, userView } from "@/server/store.js";
import { hydrationTotal } from "@/server/hydration.js";
export const runtime = "nodejs";
export async function GET(request: Request) { const state = await readState(); const session = requireUser(state, request); if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 }); const data = ensureUserData(state, session.userId); return Response.json({ days: [...data.history, data.today].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90), measurements: data.measurements.slice(-90), activity: data.activity.slice(-90) }); }

export async function DELETE(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const user = initial.users.find((item) => item.id === session.userId);
  const kind = String(body.kind || ""); const id = String(body.id || ""); const date = String(body.date || "");
  if (!['meal','water'].includes(kind) || !id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "פרטי המחיקה אינם תקינים" }, { status: 400 });
  if (kind === "meal" && (!user || !(await verifyPassword(String(body.password || ""), user.password)))) return Response.json({ error: "הסיסמה אינה נכונה" }, { status: 403 });
  let removed = false;
  const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); const day = data.today.date === date ? data.today : data.history.find((item) => item.date === date); if (!day) return latest;
    if (kind === "meal") { const meal = (day.meals || []).find((item) => item.id === id); if (meal) { latest.trash.push({ id: crypto.randomUUID(), userId: session.userId, type: "meal", data: meal, deletedAt: new Date().toISOString() }); day.meals = day.meals.filter((item) => item.id !== id); removed = true; } }
    if (kind === "water") { const matches = (item) => String(item.id || item.time || "") === id; const event = (day.waterEvents || []).find(matches); if (event) { latest.trash.push({ id: crypto.randomUUID(), userId: session.userId, type: "water", data: { ...event, date }, deletedAt: new Date().toISOString() }); let matched = false; day.waterEvents = day.waterEvents.filter((item) => { if (!matched && matches(item)) { matched = true; return false; } return true; }); if (event.mealId) day.meals = (day.meals || []).filter((meal) => meal.id !== event.mealId); day.waterMl = hydrationTotal(day.waterEvents); removed = true; } }
    if (removed) addAudit(latest, { userId: session.userId, action: `history.${kind}.deleted`, target: id }); return latest; });
  if (!removed) return Response.json({ error: "הרשומה לא נמצאה" }, { status: 404 });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
