import { requireUser } from "@/server/auth.js";
import { ensureUserData, readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json();
  const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId);
    if (body.action === "repeat") { const favorite = data.favorites.find((item) => item.id === body.id); if (!favorite) throw new Error("הארוחה המועדפת לא נמצאה"); data.today.meals.push({ ...favorite.meal, id: crypto.randomUUID(), time: new Date().toISOString(), source: "favorite" }); }
    else {
      const storedMeal = [data.today, ...(data.history || [])].flatMap((day) => day?.meals || []).find((item) => item.id === body.mealId);
      const sourceMeal = body.meal && typeof body.meal === "object" ? body.meal : storedMeal;
      if (!sourceMeal || !String(sourceMeal.name || "").trim()) throw new Error("הארוחה לא נמצאה");
      const meal = { name: String(sourceMeal.name).trim().slice(0, 120), kcal: Math.max(0, Math.round(Number(sourceMeal.kcal) || 0)), protein: Math.max(0, Math.round(Number(sourceMeal.protein) || 0)), carbs: Math.max(0, Math.round(Number(sourceMeal.carbs) || 0)), fat: Math.max(0, Math.round(Number(sourceMeal.fat) || 0)) };
      if (!data.favorites.some((item) => item.meal.name === meal.name)) data.favorites.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), meal });
    }
    return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}

export async function DELETE(request: Request) { const initial = await readState(); const session = requireUser(initial, request); if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 }); const { id, name } = await request.json(); const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); data.favorites = data.favorites.filter((item) => id ? item.id !== id : item.meal?.name !== String(name || "").trim()); return latest; }); return Response.json(userView(state, session.userId, session.role === "admin")); }

export async function PUT(request: Request) { const initial = await readState(); const session = requireUser(initial, request); if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 }); const body = await request.json(); const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); const favorite = data.favorites.find((item) => item.id === body.id); if (!favorite) return latest; favorite.meal = { ...favorite.meal, name: String(body.name || favorite.meal.name).trim().slice(0, 120), kcal: Math.max(0, Math.round(Number(body.kcal) || 0)), protein: Math.max(0, Math.round(Number(body.protein) || 0)), carbs: Math.max(0, Math.round(Number(body.carbs) || 0)), fat: Math.max(0, Math.round(Number(body.fat) || 0)) }; favorite.updatedAt = new Date().toISOString(); return latest; }); return Response.json(userView(state, session.userId, session.role === "admin")); }
