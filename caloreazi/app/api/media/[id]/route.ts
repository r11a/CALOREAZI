import { requireUser } from "@/server/auth.js";
import { readMedia } from "@/server/storage.js";
import { ensureUserData, readState } from "@/server/store.js";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) { const state = await readState(); const session = requireUser(state, request); if (!session) return new Response(null, { status: 401 }); const { id } = await context.params; const food = (state.foodCatalog || []).find((item) => item.id === id && (item.ownerId === session.userId || item.visibility === "shared")); const data = ensureUserData(state, session.userId); const meal = [...data.history.flatMap((day) => day.meals || []), ...(data.today.meals || [])].find((item) => item.id === id); const media = food?.media || meal?.media; if (!media) return new Response(null, { status: 404 }); try { return new Response(new Uint8Array(await readMedia(state, media)), { headers: { "Content-Type": media.contentType || "image/webp", "Cache-Control": "private, max-age=31536000, immutable" } }); } catch { return new Response(null, { status: 404 }); } }
