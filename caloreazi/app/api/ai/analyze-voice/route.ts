import { requireUser } from "@/server/auth.js";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateGeminiCoachReply } from "@/server/ai/gemini.js";
import { generateOpenAiCoachReply } from "@/server/ai/openai.js";
import { transcribeMealAudio } from "@/server/ai/transcribe.js";
import { estimateCost, evaluateBudget } from "@/server/ai/usage.js";
import { decryptSecret, readState, updateState } from "@/server/store.js";
export const runtime = "nodejs";

function parseItems(text: string) {
  const data = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
  const number = (value: unknown, max = 5000) => Math.min(max, Math.max(0, Math.round(Number(value) || 0)));
  const items = Array.isArray(data.items) ? data.items.slice(0, 20).map((item: any) => ({ name: String(item.name || "").trim().slice(0, 80), grams: number(item.grams, 3000), quantity: Math.max(.1, Math.min(50, Number(item.quantity) || 1)), unit: String(item.unit || "מנה").trim().slice(0, 30), kcalPer100: number(item.kcalPer100, 1000), proteinPer100: number(item.proteinPer100, 200), carbsPer100: number(item.carbsPer100, 200), fatPer100: number(item.fatPer100, 200) })).filter((item: any) => item.name && item.grams > 0) : [];
  if (!String(data.name || "").trim() || !items.length) throw new Error("לא זוהו מספיק פרטים בהקלטה");
  return { name: String(data.name).trim().slice(0, 120), items, confidence: ["low", "medium", "high"].includes(data.confidence) ? data.confidence : "low", explanation: String(data.explanation || "").trim().slice(0, 300) };
}

export async function POST(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  if (!state.ai.encryptedKey) return Response.json({ error: "מנהל המערכת טרם הגדיר שירות AI" }, { status: 409 });
  const { audioDataUrl } = await request.json();
  if (!/^data:audio\/[\w.+-]+;base64,/.test(String(audioDataUrl || ""))) return Response.json({ error: "לא התקבלה הקלטה תקינה" }, { status: 400 });
  if (String(audioDataUrl).length > 14_000_000) return Response.json({ error: "ההקלטה ארוכה מדי; נסה תיאור קצר יותר" }, { status: 413 });
  const month = new Date().toISOString().slice(0, 7); const spent = state.aiUsage.filter((item) => item.month === month).reduce((sum, item) => sum + Number(item.cost || 0), 0);
  if (!evaluateBudget({ spentUsd: spent, monthlyBudgetUsd: state.ai.monthlyBudget, softLimitPercent: state.ai.softLimit, hardLimitEnabled: state.ai.hardLimit }).allowed) return Response.json({ error: "תקציב ה-AI החודשי הגיע למגבלה הקשיחה" }, { status: 429 });
  try {
    const apiKey = await decryptSecret(state.ai.encryptedKey);
    const transcript = await transcribeMealAudio({ provider: state.ai.provider, apiKey, model: state.ai.model, audioDataUrl: String(audioDataUrl) });
    if (!transcript) throw new Error("לא נשמע תיאור ברור בהקלטה");
    const call = state.ai.provider === "gemini" ? generateGeminiCoachReply : generateOpenAiCoachReply;
    const result = await call({ apiKey, model: state.ai.model, instructions: "אתה מנתח תזונה זהיר. פרק את תיאור הארוחה לפריטים נפרדים. מספר כמו שתי חתיכות הוא quantity=2 והמשקל הוא לפריט אחד. אל תנחש ודאות כשכמות חסרה. החזר JSON תקין בלבד.", input: `תמלול: ${transcript}\nהחזר בדיוק: {"name":"שם ארוחה בעברית","items":[{"name":"שם פריט","grams":150,"quantity":1,"unit":"חתיכה","kcalPer100":100,"proteinPer100":10,"carbsPer100":12,"fatPer100":3}],"confidence":"low|medium|high","explanation":"הנחות קצרות"}` });
    const analysis = parseItems(result.text); const cost = estimateCost({ inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, inputCostPerMillion: state.ai.inputCost, outputCostPerMillion: state.ai.outputCost });
    await updateState((latest) => { latest.aiUsage.push({ id: crypto.randomUUID(), month, at: new Date().toISOString(), userId: session.userId, feature: "meal_voice", provider: latest.ai.provider, model: latest.ai.model, ...result.usage, cost }); return latest; });
    return Response.json({ transcript, ...analysis, usage: { ...result.usage, estimatedCost: cost } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "ניתוח ההקלטה נכשל" }, { status: 502 }); }
}
