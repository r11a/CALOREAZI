import { requireUser } from "@/server/auth.js";
import { generateFoodImage } from "@/server/ai/images.js";
import { decryptSecret, readState, updateState } from "@/server/store.js";
import { saveMediaDataUrl } from "@/server/storage.js";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  return Response.json((state.foodCatalog || []).filter((food) => food.visibility === "shared" || food.ownerId === session.userId));
}

export async function POST(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const name = String(body.name || "").trim();
  if (!name || !(Number(body.kcal) > 0)) return Response.json({ error: "יש להזין שם וערכים תזונתיים" }, { status: 400 });
  let image = String(body.image || "");
  if (!image) {
    const normalized = name.toLocaleLowerCase("he-IL");
    image = String((state.foodCatalog || []).find((food) => food.image && String(food.name).toLocaleLowerCase("he-IL") === normalized && (food.visibility === "shared" || food.ownerId === session.userId))?.image || "");
  }
  if (body.generateImage && !image) {
    if (!state.ai.encryptedKey) return Response.json({ error: "לא הוגדר שירות AI ליצירת תמונה" }, { status: 409 });
    image = await generateFoodImage({ provider: state.ai.provider, apiKey: await decryptSecret(state.ai.encryptedKey), name });
  }
  if (image && !/^data:image\/(jpeg|png|webp);base64,/.test(image)) return Response.json({ error: "פורמט התמונה אינו תקין" }, { status: 400 });
  const id = crypto.randomUUID(); const media = image ? await saveMediaDataUrl(state, image, id) : null;
  const food = { id, ownerId: session.userId, ownerName: state.users.find((item) => item.id === session.userId)?.name || "", visibility: body.visibility === "shared" ? "shared" : "private", category: ["vegetables", "fruits", "drinks", "meals"].includes(body.category) ? body.category : "meals", name: name.slice(0, 120), kcal: Math.round(Number(body.kcal)), protein: Math.max(0, Math.round(Number(body.protein) || 0)), carbs: Math.max(0, Math.round(Number(body.carbs) || 0)), fat: Math.max(0, Math.round(Number(body.fat) || 0)), items: Array.isArray(body.items) ? body.items.slice(0, 30) : [], image: media ? `api/media/${id}` : image, media, createdAt: new Date().toISOString() };
  await updateState((latest) => { latest.foodCatalog = Array.isArray(latest.foodCatalog) ? latest.foodCatalog : []; latest.foodCatalog.push(food); return latest; });
  return Response.json(food, { status: 201 });
}
