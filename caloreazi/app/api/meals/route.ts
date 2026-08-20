import { requireUser } from "@/server/auth.js";
import { calculateMealFromItems, calculateMealScore } from "@/server/nutrition.js";
import { addAudit, ensureUserData, readState, updateState, userView } from "@/server/store.js";
import { saveMediaDataUrl } from "@/server/storage.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const name = String(body.name || "").trim();
  const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  const calculated = items.length ? calculateMealFromItems(items) : body;
  const kcal = Math.max(0, Number(calculated.kcal) || 0);
  if (!name || !kcal) return Response.json({ error: "יש להזין שם ארוחה וקלוריות" }, { status: 400 });
  const state = await updateState(async (latest) => {
    const data = ensureUserData(latest, session.userId);
    const source = ["photo", "voice"].includes(body.source) ? body.source : "manual";
    const originalImage = /^data:image\/(jpeg|png|webp);base64,/.test(String(body.image || "")) && String(body.image).length <= 8_000_000 ? String(body.image) : ""; const id = crypto.randomUUID(); const media = originalImage ? await saveMediaDataUrl(latest, originalImage, id) : null;
    const meal = { id, name, period: ["breakfast", "lunch", "dinner", "snack"].includes(body.period) ? body.period : "snack", kcal, protein: Math.max(0, Number(calculated.protein) || 0), carbs: Math.max(0, Number(calculated.carbs) || 0), fat: Math.max(0, Number(calculated.fat) || 0), items, source, image: media ? `api/media/${id}` : "", media, confidence: Math.max(0, Math.min(1, Number(body.confidence) || .75)), transcript: source === "voice" ? String(body.transcript || "").slice(0, 1000) : "", time: new Date().toISOString() };
    meal.score = calculateMealScore(meal);
    data.today.meals.push(meal);
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
  const state = await updateState((latest) => { const today = ensureUserData(latest, session.userId).today; const meal = today.meals.find((item) => item.id === id); if (meal) { latest.trash.push({ id: crypto.randomUUID(), userId: session.userId, type: "meal", data: meal, deletedAt: new Date().toISOString() }); today.meals = today.meals.filter((item) => item.id !== id); addAudit(latest, { userId: session.userId, action: "meal.deleted", target: id }); } return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
