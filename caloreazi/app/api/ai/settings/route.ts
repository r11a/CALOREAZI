import { decryptSecret, encryptSecret, publicState, readState, updateState } from "@/server/store.js";
import { generateOpenAiCoachReply } from "@/server/ai/openai.js";
import { generateGeminiCoachReply } from "@/server/ai/gemini.js";
export const runtime = "nodejs";

export async function GET() { const state = await readState(); return Response.json(publicState(state).ai); }
export async function PUT(request: Request) {
  const body = await request.json();
  const state = await updateState(async (state) => {
    state.ai = { ...state.ai, provider: body.provider === "gemini" ? "gemini" : "openai", model: String(body.model || "").trim(), inputCost: Math.max(0, Number(body.inputCost) || 0), outputCost: Math.max(0, Number(body.outputCost) || 0), monthlyBudget: Math.max(0, Number(body.monthlyBudget) || 0), softLimit: Math.min(100, Math.max(1, Number(body.softLimit) || 80)), hardLimit: body.hardLimit !== false };
    if (String(body.apiKey || "").trim()) state.ai.encryptedKey = await encryptSecret(String(body.apiKey).trim());
    return state;
  });
  return Response.json(publicState(state).ai);
}
export async function POST() {
  try {
    const state = await readState();
    const apiKey = await decryptSecret(state.ai.encryptedKey);
    const call = state.ai.provider === "gemini" ? generateGeminiCoachReply : generateOpenAiCoachReply;
    const result = await call({ apiKey, model: state.ai.model, instructions: "Reply with the single Hebrew word תקין", input: "Connection test" });
    return Response.json({ ok: true, reply: result.text, usage: result.usage });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AI connection test failed" }, { status: 502 });
  }
}
