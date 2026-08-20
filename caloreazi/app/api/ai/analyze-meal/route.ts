import { requireUser } from "@/server/auth.js";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateGeminiCoachReply } from "@/server/ai/gemini.js";
import { generateOpenAiCoachReply } from "@/server/ai/openai.js";
import { aiErrorStatus } from "@/server/ai/http.js";
import { findModel } from "@/server/ai/models.js";
import { estimateCost, evaluateBudget } from "@/server/ai/usage.js";
import { decryptSecret, readState, updateState } from "@/server/store.js";
export const runtime = "nodejs";

function parseResult(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const data = JSON.parse(cleaned);
  const number = (value: unknown, max = 5000) => Math.min(max, Math.max(0, Math.round(Number(value) || 0)));
  const items = Array.isArray(data.items) ? data.items.slice(0, 20).map((item: any) => ({
    name: String(item.name || "").trim().slice(0, 80), grams: number(item.grams, 3000), quantity: Math.max(.1, Math.min(50, Number(item.quantity) || 1)), unit: String(item.unit || "מנה").trim().slice(0, 30), kcalPer100: number(item.kcalPer100, 1000), proteinPer100: number(item.proteinPer100, 200), carbsPer100: number(item.carbsPer100, 200), fatPer100: number(item.fatPer100, 200),
  })).filter((item: any) => item.name && item.grams > 0) : [];
  if (!String(data.name || "").trim() || !items.length) throw new Error("ה-AI לא החזיר פירוט פריטים מלא");
  return { name: String(data.name).trim().slice(0, 120), items, confidence: ["low", "medium", "high"].includes(data.confidence) ? data.confidence : "low", explanation: String(data.explanation || "").trim().slice(0, 300) };
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
    const calibration = (state.userData[session.userId]?.foodCalibration || []).slice(-30).map((item: any) => `${item.originalName ? `זוהה ${item.originalName} ותוקן ל-${item.name}` : item.name}: ${item.quantity || 1} יחידות, ${item.grams} גרם ליחידה`).join("; ");
    const knownFoods = (state.foodCatalog || []).filter((food) => food.ownerId === session.userId || food.visibility === "shared").slice(-40).map((food) => food.name).join(", ");
    const result = await call({ apiKey: await decryptSecret(state.ai.encryptedKey), model: state.ai.model, instructions: `אתה מנתח תזונה זהיר. בצע בדיקה חזותית בשני שלבים: תחילה מנה את כל הפריטים והחתיכות, ואז בדוק שלא איחדת סוגי בשר או תוספות דומות. למשל שתי חתיכות פרגית ושתי חתיכות חזה עוף הן שני פריטים, quantity=2 לכל אחד. הערך רק מזון שנראה. grams הוא משקל יחידה אחת ו-quantity מספר היחידות. אם הזיהוי או הכמות אינם ברורים, הורד confidence וציין חלופות. תיקוני עבר: ${calibration || "אין"}. מאכלים מוכרים: ${knownFoods || "אין"}. החזר JSON בלבד.`, input: 'החזר בדיוק: {"name":"שם ארוחה בעברית","items":[{"name":"שם פריט ספציפי","grams":150,"quantity":1,"unit":"חתיכה","kcalPer100":100,"proteinPer100":10,"carbsPer100":12,"fatPer100":3}],"confidence":"low|medium|high","explanation":"מה נראה, הנחות כמות וחלופות אפשריות"}', imageDataUrl: String(imageDataUrl) });
    const analysis = parseResult(result.text);
    const cost = estimateCost({ inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, inputCostPerMillion: state.ai.inputCost, outputCostPerMillion: state.ai.outputCost });
    await updateState((latest) => { latest.aiUsage.push({ id: crypto.randomUUID(), month, at: new Date().toISOString(), userId: session.userId, feature: "meal_photo", provider: latest.ai.provider, model: latest.ai.model, ...result.usage, cost }); return latest; });
    return Response.json({ ...analysis, usage: { ...result.usage, estimatedCost: cost } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "ניתוח התמונה נכשל" }, { status: aiErrorStatus(error) }); }
}
