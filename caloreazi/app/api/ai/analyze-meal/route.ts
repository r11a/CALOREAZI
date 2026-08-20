import { requireUser } from "@/server/auth.js";
import { generateGeminiCoachReply } from "@/server/ai/gemini.js";
import { generateOpenAiCoachReply } from "@/server/ai/openai.js";
import { findModel } from "@/server/ai/models.js";
import { estimateCost, evaluateBudget } from "@/server/ai/usage.js";
import { decryptSecret, readState, updateState } from "@/server/store.js";
export const runtime = "nodejs";

function parseResult(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const data = JSON.parse(cleaned);
  const number = (value: unknown) => Math.max(0, Math.round(Number(value) || 0));
  if (!String(data.name || "").trim() || number(data.kcal) < 1) throw new Error("ה-AI לא החזיר הערכת ארוחה מלאה");
  return { name: String(data.name).trim().slice(0, 120), kcal: number(data.kcal), protein: number(data.protein), carbs: number(data.carbs), fat: number(data.fat), confidence: ["low", "medium", "high"].includes(data.confidence) ? data.confidence : "low", explanation: String(data.explanation || "").trim().slice(0, 300) };
}

export async function POST(request: Request) {
  const state = await readState();
  const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  if (!state.ai.encryptedKey) return Response.json({ error: "מנהל המערכת טרם הגדיר שירות AI" }, { status: 409 });
  if (!findModel(state.ai.provider, state.ai.model)?.vision) return Response.json({ error: "המודל שנבחר אינו תומך בתמונות" }, { status: 409 });
  const { imageDataUrl } = await request.json();
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(imageDataUrl || ""))) return Response.json({ error: "יש לצלם או לבחור תמונת JPG, PNG או WebP" }, { status: 400 });
  if (String(imageDataUrl).length > 8_000_000) return Response.json({ error: "התמונה גדולה מדי" }, { status: 413 });
  const month = new Date().toISOString().slice(0, 7);
  const spent = state.aiUsage.filter((item) => item.month === month).reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const budget = evaluateBudget({ spentUsd: spent, monthlyBudgetUsd: state.ai.monthlyBudget, softLimitPercent: state.ai.softLimit, hardLimitEnabled: state.ai.hardLimit });
  if (!budget.allowed) return Response.json({ error: "תקציב ה-AI החודשי הגיע למגבלה הקשיחה" }, { status: 429 });
  try {
    const call = state.ai.provider === "gemini" ? generateGeminiCoachReply : generateOpenAiCoachReply;
    const result = await call({ apiKey: await decryptSecret(state.ai.encryptedKey), model: state.ai.model, instructions: "אתה מנתח תזונה זהיר. הערך רק מזון שנראה בתמונה. כאשר הכמות אינה ברורה ציין זאת ואל תציג ודאות מזויפת. החזר JSON תקין בלבד, ללא markdown.", input: 'החזר בדיוק: {"name":"שם ארוחה בעברית","kcal":0,"protein":0,"carbs":0,"fat":0,"confidence":"low|medium|high","explanation":"הסבר קצר בעברית כולל הנחות לגבי גודל המנה"}', imageDataUrl: String(imageDataUrl) });
    const analysis = parseResult(result.text);
    const cost = estimateCost({ inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, inputCostPerMillion: state.ai.inputCost, outputCostPerMillion: state.ai.outputCost });
    await updateState((latest) => { latest.aiUsage.push({ id: crypto.randomUUID(), month, at: new Date().toISOString(), userId: session.userId, feature: "meal_photo", provider: latest.ai.provider, model: latest.ai.model, ...result.usage, cost }); return latest; });
    return Response.json({ ...analysis, usage: { ...result.usage, estimatedCost: cost } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "ניתוח התמונה נכשל" }, { status: 502 }); }
}
