import { publicState, updateState } from "@/server/store.js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name || "").trim();
  const kcal = Math.max(0, Number(body.kcal) || 0);
  if (!name || !kcal) return Response.json({ error: "יש להזין שם ארוחה וקלוריות" }, { status: 400 });
  const state = await updateState((state) => { state.today.meals.push({ id: crypto.randomUUID(), name, kcal, protein: Math.max(0, Number(body.protein) || 0), carbs: Math.max(0, Number(body.carbs) || 0), fat: Math.max(0, Number(body.fat) || 0), time: new Date().toISOString() }); return state; });
  return Response.json(publicState(state));
}
export async function DELETE(request: Request) {
  const { id } = await request.json();
  const state = await updateState((state) => { state.today.meals = state.today.meals.filter((meal) => meal.id !== id); return state; });
  return Response.json(publicState(state));
}
