import { aiRole } from "@/server/ai/models.js";
import { transcribeMealAudio } from "@/server/ai/transcribe.js";
import { requireUser } from "@/server/auth.js";
import { decryptSecret, readState } from "@/server/store.js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const state = await readState();
  const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  if (!state.ai.encryptedKey) return Response.json({ error: "שירות התמלול אינו מוגדר" }, { status: 409 });
  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || !audio.size) return Response.json({ error: "לא התקבלה הקלטה" }, { status: 400 });
  if (audio.size > 8_000_000) return Response.json({ error: "ההקלטה ארוכה מדי" }, { status: 413 });
  const role = aiRole(state.ai, "coach");
  try {
    const audioDataUrl = `data:${audio.type || "audio/webm"};base64,${Buffer.from(await audio.arrayBuffer()).toString("base64")}`;
    const transcript = await transcribeMealAudio({ provider: role.provider, apiKey: await decryptSecret(state.ai.encryptedKey), model: role.model, audioDataUrl });
    if (!transcript) return Response.json({ error: "לא הצלחתי להבין את ההקלטה" }, { status: 422 });
    return Response.json({ transcript });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "התמלול נכשל" }, { status: 502 });
  }
}
