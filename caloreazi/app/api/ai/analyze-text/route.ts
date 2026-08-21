import { requireUser } from "@/server/auth.js";
import { generateGeminiCoachReply } from "@/server/ai/gemini.js";
import { generateOpenAiCoachReply } from "@/server/ai/openai.js";
import { aiErrorStatus } from "@/server/ai/http.js";
import { estimateCost, evaluateBudget } from "@/server/ai/usage.js";
import { decryptSecret, readState, updateState } from "@/server/store.js";
import { aiRole, findModel } from "@/server/ai/models.js";
export const runtime = "nodejs";
/* eslint-disable @typescript-eslint/no-explicit-any */

function parseItems(text: string) {
  const data = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
  const number = (value: unknown, max = 5000) => Math.min(max, Math.max(0, Math.round(Number(value) || 0)));
  const items = Array.isArray(data.items) ? data.items.slice(0, 20).map((item: any) => ({ name: String(item.name || "").trim().slice(0, 80), grams: number(item.grams, 3000), quantity: Math.max(.1, Math.min(50, Number(item.quantity) || 1)), unit: String(item.unit || "מנה").trim().slice(0, 30), kcalPer100: number(item.kcalPer100, 1000), proteinPer100: number(item.proteinPer100, 200), carbsPer100: number(item.carbsPer100, 200), fatPer100: number(item.fatPer100, 200) })).filter((item: any) => item.name && item.grams > 0) : [];
  if (!String(data.name || "").trim() || !items.length) throw new Error("ה-AI לא החזיר פירוט שניתן לאישור");
  return { name: String(data.name).trim().slice(0, 120), items, confidence: ["low", "medium", "high"].includes(data.confidence) ? data.confidence : "low", explanation: String(data.explanation || "").trim().slice(0, 300) };
}

export async function POST(request: Request) {
  const state = await readState(); const session = requireUser(state, request); if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { description, correction, draft } = await request.json();
  const correctionText = String(correction || "").trim().slice(0, 500);
  const text = String(description || "").trim().slice(0, 1000);
  if (!correctionText && text.length < 2) return Response.json({ error: "יש לתאר מה אכלת ובאיזו כמות" }, { status: 400 });
  const draftItems = Array.isArray(draft?.items) ? draft.items.slice(0, 20) : [];
  if (correctionText && !draftItems.length) return Response.json({ error: "אין עדיין תוצאת זיהוי שאפשר לתקן" }, { status: 400 });
  if (!state.ai.encryptedKey) return Response.json({ error: "מנהל המערכת טרם הגדיר שירות AI" }, { status: 409 });
  const month = new Date().toISOString().slice(0, 7); const spent = state.aiUsage.filter((item) => item.month === month).reduce((sum, item) => sum + Number(item.cost || 0), 0);
  if (!evaluateBudget({ spentUsd: spent, monthlyBudgetUsd: state.ai.monthlyBudget, softLimitPercent: state.ai.softLimit, hardLimitEnabled: state.ai.hardLimit }).allowed) return Response.json({ error: "תקציב ה-AI החודשי הגיע למגבלה" }, { status: 429 });
  try {
    const role = aiRole(state.ai, "vision"); const selectedModel = findModel(role.provider, role.model); const call = role.provider === "gemini" ? generateGeminiCoachReply : generateOpenAiCoachReply; const userData = state.userData[session.userId];
    const calibration = (userData?.foodCalibration || []).slice(-40).map((item: any) => `${item.originalName || item.name}=>${item.name}, ${item.grams}g x ${item.quantity || 1}`).join("; ");
    const correctionInput = correctionText
      ? `טיוטה קיימת: ${JSON.stringify({ name: String(draft?.name || "").slice(0, 120), items: draftItems })}\nתיקון המשתמש: ${correctionText}\nעדכן רק את מה שנדרש מהתיקון. שמור פריטים וערכים שלא הושפעו ממנו.`
      : `תיאור המשתמש: ${text}`;
    const result = await call({ apiKey: await decryptSecret(state.ai.encryptedKey), model: role.model, instructions: `אתה מנוע רישום תזונה מדויק. פרק כל מזון לפריט נפרד. quantity הוא מספר היחידות ו-grams הוא משקל יחידה אחת. אם הכמות לא נמסרה, השתמש במנה ישראלית טיפוסית אך סמן ביטחון נמוך והסבר את ההנחה. אל תמציא מרכיבים. בתיקון טיוטה בצע שינוי ממוקד ואל תנתח מחדש רכיבים שלא השתנו. תיקוני עבר: ${calibration || "אין"}. החזר JSON בלבד.`, input: `${correctionInput}\nהחזר בדיוק: {"name":"שם הארוחה","items":[{"name":"פריט","grams":100,"quantity":1,"unit":"מנה","kcalPer100":100,"proteinPer100":10,"carbsPer100":10,"fatPer100":3}],"confidence":"low|medium|high","explanation":"מה תוקן והנחות קצרות בעברית"}` });
    const analysis = parseItems(result.text); const cost = estimateCost({ inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, inputCostPerMillion: selectedModel?.inputCost || state.ai.inputCost, outputCostPerMillion: selectedModel?.outputCost || state.ai.outputCost });
    await updateState((latest) => { latest.aiUsage.push({ id: crypto.randomUUID(), month, at: new Date().toISOString(), userId: session.userId, feature: correctionText ? "meal_ai_correction" : "meal_manual_ai", provider: role.provider, model: role.model, ...result.usage, cost }); return latest; });
    return Response.json({ ...analysis, usage: { ...result.usage, estimatedCost: cost } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "חישוב הארוחה נכשל" }, { status: aiErrorStatus(error) }); }
}
