import { requireUser } from "@/server/auth.js";
import { generateFoodImage } from "@/server/ai/images.js";
import { aiRole } from "@/server/ai/models.js";
import { findOwnedMeal } from "@/server/domains/meals/repository.js";
import { saveMediaDataUrl } from "@/server/storage.js";
import { decryptSecret, readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";

const normalize = (value: unknown) => String(value || "").toLocaleLowerCase("he-IL").replace(/[׳'״".,()]/g, "").replace(/\s+/g, " ").trim();
const isGenericImage = (value: unknown) => /(?:category-|food-sprite-|generic|placeholder)/i.test(String(value || ""));

export async function POST(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const id = String(body.id || "");
  const owned = findOwnedMeal(state, session.userId, id);
  if (!owned) return Response.json({ error: "הארוחה לא נמצאה" }, { status: 404 });
  if (owned.meal.image && !isGenericImage(owned.meal.image)) return Response.json({ ...userView(state, session.userId, session.role === "admin"), imageCompleted: false, imageSource: "existing" });
  const candidates = [owned.meal.name, ...(owned.meal.items || []).map((item) => item.name)].map(normalize).filter(Boolean);
  const catalogMatch = (state.foodCatalog || []).find((food) => food.image && (food.visibility === "shared" || food.ownerId === session.userId) && candidates.some((candidate) => { const foodName = normalize(food.name); return candidate === foodName || candidate.includes(foodName) || foodName.includes(candidate); }));
  let image = String(catalogMatch?.image || ""); let media = null; let imageSource = image ? "catalog" : "";
  try {
    if (!image && body.allowGenerate && state.ai.encryptedKey) {
      const role = aiRole(state.ai, "image");
      image = await generateFoodImage({ provider: role.provider, model: role.model, apiKey: await decryptSecret(state.ai.encryptedKey), name: owned.meal.name });
      imageSource = "generated";
    }
    if (/^data:image\/(jpeg|png|webp);base64,/.test(image)) { media = await saveMediaDataUrl(state, image, id, { maxSize: 384, quality: 72 }); image = media ? `api/media/${id}` : ""; }
  } catch (error) {
    return Response.json({ ...userView(state, session.userId, session.role === "admin"), imageCompleted: false, imageWarning: error instanceof Error ? error.message : "השלמת התמונה נכשלה" });
  }
  if (!image) return Response.json({ ...userView(state, session.userId, session.role === "admin"), imageCompleted: false, imageSource: "none" });
  const latest = await updateState((current) => { const target = findOwnedMeal(current, session.userId, id)?.meal; if (target && (!target.image || isGenericImage(target.image))) { target.image = image; target.media = media || catalogMatch?.media || null; target.imageSource = imageSource; } return current; });
  return Response.json({ ...userView(latest, session.userId, session.role === "admin"), imageCompleted: true, imageSource });
}
