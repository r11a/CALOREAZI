import { addAudit, decryptSecret, encryptSecret, publicState, readState, updateState } from "@/server/store.js";
import { currentSession, requireAdmin } from "@/server/auth.js";
import { generateOpenAiCoachReply } from "@/server/ai/openai.js";
import { generateGeminiCoachReply } from "@/server/ai/gemini.js";
import { AI_MODELS, findModel } from "@/server/ai/models.js";
export const runtime = "nodejs";

export async function GET(request: Request) { const state = await readState(); const denied = requireAdmin(state, request); return denied || Response.json({ settings: publicState(state, true).ai, models: AI_MODELS }); }
export async function PUT(request: Request) {
  const current = await readState();
  const denied = requireAdmin(current, request);
  if (denied) return denied;
  const body = await request.json();
  const provider = body.provider === "gemini" ? "gemini" : "openai";
  const selected = findModel(provider, String(body.model || ""));
  if (!selected) return Response.json({ error: "המודל אינו ברשימת המודלים המאושרת" }, { status: 400 });
  const state = await updateState(async (state) => {
    state.ai = { ...state.ai, provider, model: selected.id, inputCost: selected.inputCost, outputCost: selected.outputCost, monthlyBudget: Math.max(0, Number(body.monthlyBudget) || 0), softLimit: Math.min(100, Math.max(1, Number(body.softLimit) || 80)), hardLimit: body.hardLimit !== false };
    if (String(body.apiKey || "").trim()) state.ai.encryptedKey = await encryptSecret(String(body.apiKey).trim());
    addAudit(state, { userId: currentSession(request)?.userId, action: "ai.settings_updated", target: `${provider}/${selected.id}`, details: String(body.apiKey || "").trim() ? "API key replaced" : "Configuration updated" });
    return state;
  });
  return Response.json(publicState(state, true).ai);
}
export async function POST(request: Request) {
  try {
    const state = await readState();
    const denied = requireAdmin(state, request);
    if (denied) return denied;
    const apiKey = await decryptSecret(state.ai.encryptedKey);
    const call = state.ai.provider === "gemini" ? generateGeminiCoachReply : generateOpenAiCoachReply;
    const result = await call({ apiKey, model: state.ai.model, instructions: "Reply with the single Hebrew word תקין", input: "Connection test" });
    return Response.json({ ok: true, reply: result.text, usage: result.usage });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AI connection test failed" }, { status: 502 });
  }
}
