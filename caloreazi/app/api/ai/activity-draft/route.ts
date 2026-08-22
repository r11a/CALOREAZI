import { requireUser } from "@/server/auth.js";
import { generateGeminiCoachReply } from "@/server/ai/gemini.js";
import { generateOpenAiCoachReply } from "@/server/ai/openai.js";
import { aiErrorStatus } from "@/server/ai/http.js";
import { aiRole } from "@/server/ai/models.js";
import { decryptSecret, readState } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const description = String((await request.json()).description || "").trim().slice(0, 700);
  if (description.length < 3) return Response.json({ error: "יש לתאר את הפעילות והמשך שלה" }, { status: 400 });
  if (!state.ai.encryptedKey) return Response.json({ error: "מנהל המערכת טרם הגדיר שירות AI" }, { status: 409 });
  try {
    const role = aiRole(state.ai, "coach"); const call = role.provider === "gemini" ? generateGeminiCoachReply : generateOpenAiCoachReply;
    const weight = Number(state.userData[session.userId]?.measurements?.at(-1)?.weight || state.userData[session.userId]?.profile?.weight || 75);
    const result = await call({ apiKey: await decryptSecret(state.ai.encryptedKey), model: role.model, instructions: "נתח תיאור פעילות גופנית. החזר JSON בלבד, ללא markdown. אל תגזים בקלוריות והצג הערכה שמרנית.", input: `${description}\nמשקל המשתמש: ${weight} ק״ג. החזר בדיוק {"type":"סוג","minutes":30,"steps":0,"distanceKm":0,"activeCalories":150,"intensity":"low|medium|high","explanation":"הנחה קצרה"}` });
    const data = JSON.parse(result.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
    return Response.json({ type: String(data.type || "פעילות אחרת").slice(0, 60), minutes: Math.max(0, Math.min(600, Number(data.minutes) || 0)), steps: Math.max(0, Math.round(Number(data.steps) || 0)), distanceKm: Math.max(0, Math.min(500, Number(data.distanceKm) || 0)), activeCalories: Math.max(0, Math.min(5000, Math.round(Number(data.activeCalories) || 0))), intensity: ["low","medium","high"].includes(data.intensity) ? data.intensity : "medium", explanation: String(data.explanation || "הערכת AI").slice(0, 240) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "ניתוח הפעילות נכשל" }, { status: aiErrorStatus(error) }); }
}
