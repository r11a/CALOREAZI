import { requireUser } from "@/server/auth.js";
import { ensureUserData, readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json();
  const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId);
    if (body.action === "repeat") { const favorite = data.favorites.find((item) => item.id === body.id); if (!favorite) throw new Error("הארוחה המועדפת לא נמצאה"); data.today.meals.push({ ...favorite.meal, id: crypto.randomUUID(), time: new Date().toISOString(), source: "favorite" }); }
    else { const meal = data.today.meals.find((item) => item.id === body.mealId); if (!meal) throw new Error("הארוחה לא נמצאה"); if (!data.favorites.some((item) => item.meal.name === meal.name)) data.favorites.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), meal: { name: meal.name, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat } }); }
    return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}

export async function DELETE(request: Request) { const initial = await readState(); const session = requireUser(initial, request); if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 }); const { id } = await request.json(); const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); data.favorites = data.favorites.filter((item) => item.id !== id); return latest; }); return Response.json(userView(state, session.userId, session.role === "admin")); }
