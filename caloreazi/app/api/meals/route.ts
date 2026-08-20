import { requireUser } from "@/server/auth.js";
import { calculateMealFromItems } from "@/server/nutrition.js";
import { ensureUserData, readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const name = String(body.name || "").trim();
  const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  const calculated = items.length ? calculateMealFromItems(items) : body;
  const kcal = Math.max(0, Number(calculated.kcal) || 0);
  if (!name || !kcal) return Response.json({ error: "יש להזין שם ארוחה וקלוריות" }, { status: 400 });
  const state = await updateState((latest) => {
    const data = ensureUserData(latest, session.userId);
    const source = ["photo", "voice"].includes(body.source) ? body.source : "manual";
    data.today.meals.push({ id: crypto.randomUUID(), name, period: ["breakfast", "lunch", "dinner", "snack"].includes(body.period) ? body.period : "snack", kcal, protein: Math.max(0, Number(calculated.protein) || 0), carbs: Math.max(0, Number(calculated.carbs) || 0), fat: Math.max(0, Number(calculated.fat) || 0), items, source, transcript: source === "voice" ? String(body.transcript || "").slice(0, 1000) : "", time: new Date().toISOString() });
    if (["photo", "voice"].includes(source) && items.length) {
      const original = Array.isArray(body.aiOriginalItems) ? body.aiOriginalItems : [];
      items.forEach((item, index) => {
        const before = original[index];
        if (!before || String(before.name) !== String(item.name) || Number(before.grams) !== Number(item.grams) || Number(before.quantity) !== Number(item.quantity)) data.foodCalibration.push({ originalName: before?.name || null, name: String(item.name).slice(0, 80), grams: Math.max(1, Number(item.grams) || 1), quantity: Math.max(.1, Number(item.quantity) || 1), previousGrams: before ? Number(before.grams) : null, at: new Date().toISOString() });
      });
      data.foodCalibration = data.foodCalibration.slice(-100);
    }
    return latest;
  });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}

export async function DELETE(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { id } = await request.json();
  const state = await updateState((latest) => { const today = ensureUserData(latest, session.userId).today; today.meals = today.meals.filter((meal) => meal.id !== id); return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
