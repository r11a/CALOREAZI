import { requireUser } from "@/server/auth.js";
import { ensureUserData, readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const name = String(body.name || "").trim(); const kcal = Math.max(0, Number(body.kcal) || 0);
  if (!name || !kcal) return Response.json({ error: "יש להזין שם ארוחה וקלוריות" }, { status: 400 });
  const state = await updateState((latest) => { ensureUserData(latest, session.userId).today.meals.push({ id: crypto.randomUUID(), name, kcal, protein: Math.max(0, Number(body.protein) || 0), carbs: Math.max(0, Number(body.carbs) || 0), fat: Math.max(0, Number(body.fat) || 0), time: new Date().toISOString() }); return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
export async function DELETE(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { id } = await request.json();
  const state = await updateState((latest) => { const today = ensureUserData(latest, session.userId).today; today.meals = today.meals.filter((meal) => meal.id !== id); return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
