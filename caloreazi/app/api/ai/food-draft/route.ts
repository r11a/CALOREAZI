import { requireUser } from "@/server/auth.js";
import { generateGeminiCoachReply } from "@/server/ai/gemini.js";
import { generateFoodImage } from "@/server/ai/images.js";
import { generateOpenAiCoachReply } from "@/server/ai/openai.js";
import { aiErrorStatus } from "@/server/ai/http.js";
import { estimateCost, evaluateBudget } from "@/server/ai/usage.js";
import { decryptSecret, readState, updateState } from "@/server/store.js";
import { aiRole, aiRoleCandidates, findModel } from "@/server/ai/models.js";
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
    const apiKey = await decryptSecret(state.ai.encryptedKey); const visionRole = aiRole(state.ai, "vision"); const imageRole = aiRole(state.ai, "image"); const selectedModel = findModel(visionRole.provider, visionRole.model); const call = visionRole.provider === "gemini" ? generateGeminiCoachReply : generateOpenAiCoachReply;
    const result = await call({ apiKey, model: visionRole.model, instructions: "אתה מנוע נתוני תזונה. החזר JSON בלבד, ללא Markdown. השתמש במנה יחידה מקובלת וסבירה בישראל, וציין אותה בבירור.", input: `פריט: ${foodName}. קטגוריה: ${category}. החזר בדיוק {"name":"שם תקני בעברית","portion":"תיאור מנה אחת","kcal":95,"protein":1,"carbs":25,"fat":0,"confidence":"high|medium|low"}` });
    const parsed = JSON.parse(result.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
    const number = (value: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
    const draft = { name: String(parsed.name || foodName).trim().slice(0, 80), portion: String(parsed.portion || "מנה אחת").trim().slice(0, 80), kcal: number(parsed.kcal, 2000), protein: number(parsed.protein, 200), carbs: number(parsed.carbs, 300), fat: number(parsed.fat, 200), confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low" };
    if (!draft.kcal && category !== "drinks") throw new Error("לא התקבל ערך קלורי תקין");
    let image = ""; let imageWarning = "";
    let imageError: unknown; for (const candidate of aiRoleCandidates(state.ai, "image")) { try { image = await generateFoodImage({ provider: candidate.provider, model: candidate.model, apiKey, name: `${draft.name}, ${draft.portion}` }); break; } catch (error) { imageError = error; } }
    if (!image) { image = `./category-${category}-v1.png?v=103`; imageWarning = imageError instanceof Error ? imageError.message : "יצירת התמונה נכשלה"; }
    const textCost = estimateCost({ inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, inputCostPerMillion: selectedModel?.inputCost || state.ai.inputCost, outputCostPerMillion: selectedModel?.outputCost || state.ai.outputCost }); const cost = textCost + .02;
    await updateState((latest) => { latest.aiUsage.push({ id: crypto.randomUUID(), month, at: new Date().toISOString(), userId: session.userId, feature: "food_catalog_draft", provider: visionRole.provider, model: visionRole.model, imageProvider: imageRole.provider, imageModel: imageRole.model, ...result.usage, cost }); return latest; });
    return Response.json({ ...draft, image, imageWarning, estimatedCost: cost });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "יצירת הפריט נכשלה" }, { status: aiErrorStatus(error) }); }
}
