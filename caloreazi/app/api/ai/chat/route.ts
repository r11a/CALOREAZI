import { decryptSecret, readState, updateState } from "@/server/store.js";
import { generateOpenAiCoachReply } from "@/server/ai/openai.js";
import { generateGeminiCoachReply } from "@/server/ai/gemini.js";
import { estimateCost, evaluateBudget } from "@/server/ai/usage.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const { message } = await request.json();
  if (!String(message || "").trim()) return Response.json({ error: "יש לכתוב שאלה" }, { status: 400 });
  const state = await readState();
  if (!state.owner || !state.profile) return Response.json({ error: "יש להשלים Onboarding" }, { status: 409 });
  if (!state.ai.encryptedKey) return Response.json({ error: "יש להגדיר ספק AI ומפתח API בהגדרות" }, { status: 409 });
  const month = new Date().toISOString().slice(0, 7);
  const spent = state.aiUsage.filter((item) => item.month === month).reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const budget = evaluateBudget({ spentUsd: spent, monthlyBudgetUsd: state.ai.monthlyBudget, softLimitPercent: state.ai.softLimit, hardLimitEnabled: state.ai.hardLimit });
  if (!budget.allowed) return Response.json({ error: "תקציב ה-AI החודשי הגיע למגבלה הקשיחה" }, { status: 429 });
  const profile = state.profile;
  const mealCalories = state.today.meals.reduce((sum, meal) => sum + Number(meal.kcal || 0), 0);
  const instructions = `אתה המאמן האישי של CALOREAZI. השב בעברית, בקצרה, בצורה נעימה ולא שיפוטית. אינך מאבחן רפואית. המשתמש: ${state.owner.name}. מטרה: ${profile.goal}. משקל: ${profile.weight} קג. יעד קלורי: ${profile.calories}. נאכל היום: ${mealCalories}. מים: ${state.today.waterMl}/${profile.waterMl} מ״ל. מגבלות: ${profile.restrictions || "אין"}. אם חסר מידע אמור זאת.`;
  try {
    const call = state.ai.provider === "gemini" ? generateGeminiCoachReply : generateOpenAiCoachReply;
    const result = await call({ apiKey: await decryptSecret(state.ai.encryptedKey), model: state.ai.model, instructions, input: String(message).trim() });
    const cost = estimateCost({ inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, inputCostPerMillion: state.ai.inputCost, outputCostPerMillion: state.ai.outputCost });
    await updateState((latest) => { latest.aiUsage.push({ id: crypto.randomUUID(), month, at: new Date().toISOString(), userId: latest.owner.id, feature: "coach", provider: latest.ai.provider, model: latest.ai.model, ...result.usage, cost }); return latest; });
    return Response.json({ reply: result.text, usage: { ...result.usage, estimatedCost: cost, budgetState: budget.state } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "AI request failed" }, { status: 502 }); }
}
