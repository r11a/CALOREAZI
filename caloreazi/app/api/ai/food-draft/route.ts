import { requireUser } from "@/server/auth.js";
import { generateGeminiCoachReply } from "@/server/ai/gemini.js";
import { generateFoodImage } from "@/server/ai/images.js";
import { generateOpenAiCoachReply } from "@/server/ai/openai.js";
import { aiErrorStatus } from "@/server/ai/http.js";
import { estimateCost, evaluateBudget } from "@/server/ai/usage.js";
import { decryptSecret, readState, updateState } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { name, category } = await request.json(); const foodName = String(name || "").trim();
  if (foodName.length < 2 || foodName.length > 80) return Response.json({ error: "יש לרשום שם פריט קצר וברור" }, { status: 400 });
  if (!["fruits", "vegetables", "drinks"].includes(category)) return Response.json({ error: "קטגוריה לא תקינה" }, { status: 400 });
  if (!state.ai.encryptedKey) return Response.json({ error: "מנהל המערכת טרם הגדיר שירות AI" }, { status: 409 });
  const month = new Date().toISOString().slice(0, 7); const spent = state.aiUsage.filter((item) => item.month === month).reduce((sum, item) => sum + Number(item.cost || 0), 0);
  if (!evaluateBudget({ spentUsd: spent, monthlyBudgetUsd: state.ai.monthlyBudget, softLimitPercent: state.ai.softLimit, hardLimitEnabled: state.ai.hardLimit }).allowed) return Response.json({ error: "תקציב ה-AI החודשי הגיע למגבלה" }, { status: 429 });
  try {
    const apiKey = await decryptSecret(state.ai.encryptedKey); const call = state.ai.provider === "gemini" ? generateGeminiCoachReply : generateOpenAiCoachReply;
    const result = await call({ apiKey, model: state.ai.model, instructions: "אתה מנוע נתוני תזונה. החזר JSON בלבד, ללא Markdown. השתמש במנה יחידה מקובלת וסבירה בישראל, וציין אותה בבירור.", input: `פריט: ${foodName}. קטגוריה: ${category}. החזר בדיוק {"name":"שם תקני בעברית","portion":"תיאור מנה אחת","kcal":95,"protein":1,"carbs":25,"fat":0,"confidence":"high|medium|low"}` });
    const parsed = JSON.parse(result.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
    const number = (value: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
    const draft = { name: String(parsed.name || foodName).trim().slice(0, 80), portion: String(parsed.portion || "מנה אחת").trim().slice(0, 80), kcal: number(parsed.kcal, 2000), protein: number(parsed.protein, 200), carbs: number(parsed.carbs, 300), fat: number(parsed.fat, 200), confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low" };
    if (!draft.kcal && category !== "drinks") throw new Error("לא התקבל ערך קלורי תקין");
    const image = await generateFoodImage({ provider: state.ai.provider, apiKey, name: `${draft.name}, ${draft.portion}` });
    const textCost = estimateCost({ inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, inputCostPerMillion: state.ai.inputCost, outputCostPerMillion: state.ai.outputCost }); const cost = textCost + .02;
    await updateState((latest) => { latest.aiUsage.push({ id: crypto.randomUUID(), month, at: new Date().toISOString(), userId: session.userId, feature: "food_catalog_draft", provider: latest.ai.provider, model: latest.ai.model, ...result.usage, cost }); return latest; });
    return Response.json({ ...draft, image, estimatedCost: cost });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "יצירת הפריט נכשלה" }, { status: aiErrorStatus(error) }); }
}
