import { generateGeminiCoachReply } from "./ai/gemini.js";
import { generateOpenAiCoachReply } from "./ai/openai.js";
import { estimateCost } from "./ai/usage.js";
import { aiRoleCandidates, findModel } from "./ai/models.js";
import { enrichVisionItemsAuthoritative } from "./nutrition-catalog.js";
import { decryptSecret, readState, updateState } from "./store.js";

export function parseVisionResult(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim(); const data = JSON.parse(cleaned);
  const number = (value, max = 5000) => Math.min(max, Math.max(0, Math.round(Number(value) || 0)));
  const items = Array.isArray(data.items) ? data.items.slice(0, 20).map((item) => { const parsed = { name: String(item.name || "").trim().slice(0, 80), grams: number(item.grams, 3000), quantity: Math.max(.1, Math.min(50, Number(item.quantity) || 1)), unit: String(item.unit || "מנה").trim().slice(0, 30) }; const searchNameEn = String(item.searchNameEn || "").trim().slice(0, 100); return searchNameEn ? { ...parsed, searchNameEn } : parsed; }).filter((item) => item.name && item.grams > 0) : [];
  if (!String(data.name || "").trim() || !items.length) throw new Error("ה-AI לא החזיר פירוט פריטים מלא");
  return { name: String(data.name).trim().slice(0, 120), items, confidence: ["low", "medium", "high"].includes(data.confidence) ? data.confidence : "low", explanation: String(data.explanation || "").trim().slice(0, 300) };
}

export async function processNextMealAnalysis() {
  const state = await readState(); const now = Date.now(); const candidate = (state.analysisJobs || []).find((job) => job.kind === "meal_photo" && (job.status === "pending" || (job.status === "failed" && Number(job.attemptCount || 0) < 3 && (!job.nextAttemptAt || new Date(job.nextAttemptAt).getTime() <= now))));
  if (!candidate) return false;
  let claimed = false;
  await updateState((latest) => { const job = latest.analysisJobs?.find((item) => item.id === candidate.id && ["pending", "failed"].includes(item.status)); if (job) { job.status = "processing"; job.attemptCount = Number(job.attemptCount || 0) + 1; job.updatedAt = new Date().toISOString(); claimed = true; } return latest; });
  if (!claimed) return true;
  const fresh = await readState(); const job = fresh.analysisJobs.find((item) => item.id === candidate.id); const userData = fresh.userData[job.userId] || {};
  try {
    const candidates = aiRoleCandidates(fresh.ai, "vision"); let role = candidates[0]; let selectedModel; let result; let lastError;
    const calibration = (userData.foodCalibration || []).slice(-30).map((item) => `${item.originalName ? `זוהה ${item.originalName} ותוקן ל-${item.name}` : item.name}: ${item.quantity || 1} יחידות, ${item.grams} גרם ליחידה`).join("; ");
    const knownFoods = (fresh.foodCatalog || []).filter((food) => food.ownerId === job.userId || food.visibility === "shared").slice(-40).map((food) => food.name).join(", ");
    for (const candidateRole of candidates) { try { role = candidateRole; selectedModel = findModel(role.provider, role.model); const call = role.provider === "gemini" ? generateGeminiCoachReply : generateOpenAiCoachReply; result = await call({ apiKey: await decryptSecret(fresh.ai.encryptedKey), model: role.model, instructions: `אתה מנתח חזותי זהיר. מנה את כל הפריטים והחתיכות ובדוק שלא איחדת סוגי מזון. הערך רק מזון שנראה. grams הוא משקל יחידה אחת ו-quantity מספר היחידות. searchNameEn הוא שם אנגלי תמציתי לחיפוש במסד תזונה רשמי. אם הזיהוי אינו ברור הורד confidence וציין חלופות. אל תחזיר קלוריות או ערכים תזונתיים; מנוע נפרד מחשב אותם. תיקוני עבר: ${calibration || "אין"}. מאכלים מוכרים: ${knownFoods || "אין"}. החזר JSON בלבד.`, input: '{"name":"שם ארוחה בעברית","items":[{"name":"שם פריט ספציפי","searchNameEn":"plain cooked food name","grams":150,"quantity":1,"unit":"חתיכה"}],"confidence":"low|medium|high","explanation":"מה נראה והנחות כמות"}', imageDataUrl: job.input.imageDataUrl }); break; } catch (error) { lastError = error; } }
    if (!result) throw lastError || new Error("לא נמצא מודל זמין לניתוח הארוחה");
    const vision = parseVisionResult(result.text); const nutrition = await enrichVisionItemsAuthoritative(vision.items); const cost = estimateCost({ inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, inputCostPerMillion: selectedModel?.inputCost || fresh.ai.inputCost, outputCostPerMillion: selectedModel?.outputCost || fresh.ai.outputCost });
    const response = { ...vision, items: nutrition.items, nutritionStatus: nutrition.nutritionStatus, unmatchedNutritionItems: nutrition.unmatched, explanation: `${vision.explanation}${nutrition.unmatched ? ` ${nutrition.unmatched} פריטים דורשים התאמה למקור תזונתי לפני אישור.` : " הערכים חושבו ממקור תזונתי נפרד מהזיהוי החזותי."}`.trim(), usage: { ...result.usage, estimatedCost: cost } };
    await updateState((latest) => { const target = latest.analysisJobs.find((item) => item.id === job.id); if (target?.status === "cancelled") return latest; target.status = "needs_confirmation"; target.confidence = vision.confidence; target.result = response; delete target.input; target.updatedAt = new Date().toISOString(); latest.aiUsage.push({ id: crypto.randomUUID(), month: new Date().toISOString().slice(0, 7), at: new Date().toISOString(), userId: job.userId, feature: "meal_photo", provider: role.provider, model: role.model, ...result.usage, cost }); return latest; });
  } catch (error) {
    await updateState((latest) => { const target = latest.analysisJobs.find((item) => item.id === job.id); if (!target || target.status === "cancelled") return latest; target.status = "failed"; target.errorMessage = error instanceof Error ? error.message : "ניתוח התמונה נכשל"; target.nextAttemptAt = Number(target.attemptCount || 0) < 3 ? new Date(Date.now() + 2 ** target.attemptCount * 1000).toISOString() : null; target.updatedAt = new Date().toISOString(); return latest; });
  }
  return true;
}
