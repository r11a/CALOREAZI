import { requireUser } from "@/server/auth.js";
import { calculateMealFromItems, calculateMealScore, roundCalories } from "@/server/nutrition.js";
import { addAudit, ensureUserData, readState, updateState, userView } from "@/server/store.js";
import { deleteMedia, saveMediaDataUrl } from "@/server/storage.js";
import { findOwnedMeal, removeOwnedMeal, restoreOwnedMeal } from "@/server/domains/meals/repository.js";
import { entryDateFor, localDateAt, userTimeZone } from "@/server/local-date.js";
import { validateMealNutrition } from "@/server/meal-validation.js";
import { databaseStateEnabled, insertDatabaseMeal } from "@/server/state-database.js";
import { assessMealReliability } from "@/server/meal-reliability.js";
export const runtime = "nodejs";
type MealRecord = { id: string; clientRequestId?: string; logicalDate?: string; name: string; period: string; kcal: number; protein: number; carbs: number; fat: number; sugar: number; sugarTrackedItems: number; fiber?: number; fiberTrackedItems?: number; sodiumMg?: number; sodiumMgTrackedItems?: number; saturatedFat?: number; saturatedFatTrackedItems?: number; addedSugar?: number; addedSugarTrackedItems?: number; items: unknown[]; source: string; image: string; media: unknown; confidence: number; nutritionReliability?: unknown; transcript: string; time: string; score?: number; updatedAt?: string };

export async function POST(request: Request) {
  const startedAt = Date.now();
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const name = String(body.name || "").trim();
  const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  const calculated = items.length ? calculateMealFromItems(items) : body;
  const kcal = roundCalories(calculated.kcal);
  const missingFields = [...(!name ? ["שם הארוחה"] : []), ...(!kcal ? ["קלוריות"] : [])];
  if (missingFields.length) return Response.json({ error: `לא ניתן לשמור. יש להשלים: ${missingFields.join(", ")}`, fields: missingFields }, { status: 400 });
  const nutritionValidation = validateMealNutrition({ ...calculated, items });
  const nutritionReliability = assessMealReliability({ ...body, ...calculated, items });
  const hasBlockingNutritionIssue = nutritionValidation.issues.some((issue: { code?: string }) => ["photo", "voice"].includes(body.source) || issue.code === "implausible_energy_density");
  if (hasBlockingNutritionIssue)
    return Response.json({ error: nutritionValidation.issues[0].message, issues: nutritionValidation.issues, requiresConfirmation: true }, { status: 422 });
  const clientRequestId = String(body.clientRequestId || request.headers.get("idempotency-key") || "").trim().slice(0, 120);
  let savedMealId = ""; let savedLocalDate = ""; let idempotent = false;
  if (databaseStateEnabled()) {
    const data = ensureUserData(initial, session.userId);
    const existing = clientRequestId ? [data.today, ...(data.history || [])].flatMap((day) => (day.meals || []).map((meal) => ({ meal, day }))).find(({ meal }) => meal.clientRequestId === clientRequestId) : null;
    if (existing) return Response.json({ ...userView(initial, session.userId, session.role === "admin"), savedMealId: existing.meal.id, savedLocalDate: existing.day.date, persistence: { idempotent: true, transactional: true, durationMs: Date.now() - startedAt } });
    const source = ["photo", "voice"].includes(body.source) ? body.source : "manual";
    const requestedTime = new Date(body.occurredAt || Date.now()); const time = Number.isFinite(requestedTime.getTime()) && requestedTime.getTime() <= Date.now() ? requestedTime.toISOString() : new Date().toISOString();
    const id = crypto.randomUUID();
    const originalImage = /^data:image\/(jpeg|png|webp);base64,/.test(String(body.image || "")) && String(body.image).length <= 8_000_000 ? String(body.image) : "";
    const media = originalImage ? await saveMediaDataUrl(initial, originalImage, id, { maxSize: 512, quality: 72 }) : null;
    const meal: MealRecord = { id, ...(clientRequestId ? { clientRequestId } : {}), name, period: ["breakfast", "lunch", "dinner", "snack"].includes(body.period) ? body.period : "snack", kcal, protein: Math.max(0, Number(calculated.protein) || 0), carbs: Math.max(0, Number(calculated.carbs) || 0), fat: Math.max(0, Number(calculated.fat) || 0), sugar: Math.max(0, Number(calculated.sugar) || 0), sugarTrackedItems: Math.max(0, Number(calculated.sugarTrackedItems) || 0), items, source, image: media ? `api/media/${id}` : "", media, confidence: Math.max(0, Math.min(1, Number(body.confidence) || .75)), nutritionReliability, transcript: source === "voice" ? String(body.transcript || "").slice(0, 1000) : "", time };
    meal.score = calculateMealScore(meal);
    const calibrations = ["photo", "voice"].includes(source) && items.length ? items.flatMap((item: Record<string, unknown>, index) => { const before = Array.isArray(body.aiOriginalItems) ? body.aiOriginalItems[index] : null; return !before || String(before.name) !== String(item.name) || Number(before.grams) !== Number(item.grams) || Number(before.quantity) !== Number(item.quantity) ? [{ originalName: before?.name || null, name: String(item.name).slice(0, 80), grams: Math.max(1, Number(item.grams) || 1), quantity: Math.max(.1, Number(item.quantity) || 1), previousGrams: before ? Number(before.grams) : null, at: new Date().toISOString() }] : []; }) : [];
    const localDate = body.calendarDate ? localDateAt(new Date(time), userTimeZone(data)) : entryDateFor(data, new Date(time));
    meal.logicalDate = localDate;
    const state = await insertDatabaseMeal({ userId: session.userId, localDate, timeZone: userTimeZone(data), meal, analysisJobId: String(body.analysisJobId || ""), calibrations });
    const persisted = [state.userData[session.userId]?.today, ...(state.userData[session.userId]?.history || [])].filter(Boolean).flatMap((day) => day.meals || []).find((item) => item.id === id || (clientRequestId && item.clientRequestId === clientRequestId));
    if (!persisted) throw new Error("השמירה הטרנזקציונית לא אומתה במסד הנתונים");
    if (persisted.id !== id && media) await deleteMedia(initial, media);
    return Response.json({ ...userView(state, session.userId, session.role === "admin"), savedMealId: persisted.id, savedLocalDate: localDate, persistence: { idempotent: persisted.id !== id, transactional: true, durationMs: Date.now() - startedAt } });
  }
  const state = await updateState(async (latest) => {
    const data = ensureUserData(latest, session.userId);
    if (clientRequestId) {
      const existing = [data.today, ...(data.history || [])].flatMap((day) => (day.meals || []).map((meal) => ({ meal, day }))).find(({ meal }) => meal.clientRequestId === clientRequestId);
      if (existing) { savedMealId = existing.meal.id; savedLocalDate = existing.day.date; idempotent = true; return latest; }
    }
    const source = ["photo", "voice"].includes(body.source) ? body.source : "manual";
    const originalImage = /^data:image\/(jpeg|png|webp);base64,/.test(String(body.image || "")) && String(body.image).length <= 8_000_000 ? String(body.image) : ""; const id = crypto.randomUUID(); const media = originalImage ? await saveMediaDataUrl(latest, originalImage, id, { maxSize: 512, quality: 72 }) : null;
    const requestedTime = new Date(body.occurredAt || Date.now()); const time = Number.isFinite(requestedTime.getTime()) && requestedTime.getTime() <= Date.now() ? requestedTime.toISOString() : new Date().toISOString();
    const meal: MealRecord = { id, ...(clientRequestId ? { clientRequestId } : {}), name, period: ["breakfast", "lunch", "dinner", "snack"].includes(body.period) ? body.period : "snack", kcal, protein: Math.max(0, Number(calculated.protein) || 0), carbs: Math.max(0, Number(calculated.carbs) || 0), fat: Math.max(0, Number(calculated.fat) || 0), sugar: Math.max(0, Number(calculated.sugar) || 0), sugarTrackedItems: Math.max(0, Number(calculated.sugarTrackedItems) || 0), items, source, image: media ? `api/media/${id}` : "", media, confidence: Math.max(0, Math.min(1, Number(body.confidence) || .75)), nutritionReliability, transcript: source === "voice" ? String(body.transcript || "").slice(0, 1000) : "", time };
    meal.score = calculateMealScore(meal);
    if (body.analysisJobId) { const job = latest.analysisJobs?.find((item) => item.id === body.analysisJobId && item.userId === session.userId); if (job) { job.status = "completed"; job.mealId = meal.id; job.completedAt = new Date().toISOString(); job.updatedAt = job.completedAt; } }
    const localDate = body.calendarDate ? localDateAt(new Date(time), userTimeZone(data)) : entryDateFor(data, new Date(time)); meal.logicalDate = localDate; savedMealId = meal.id; savedLocalDate = localDate;
    const targetDay = localDate === data.today.date ? data.today : (data.history.find((day) => day.date === localDate) || (() => { const day = { date: localDate, waterMl: 0, meals: [] }; data.history.push(day); return day; })());
    targetDay.meals.push(meal); targetDay.meals.sort((a, b) => String(a.time).localeCompare(String(b.time))); data.history.sort((a, b) => a.date.localeCompare(b.date));
    if (["photo", "voice"].includes(source) && items.length) {
      const original = Array.isArray(body.aiOriginalItems) ? body.aiOriginalItems : [];
      items.forEach((item, index) => {
        const before = original[index];
        if (!before || String(before.name) !== String(item.name) || Number(before.grams) !== Number(item.grams) || Number(before.quantity) !== Number(item.quantity)) data.foodCalibration.push({ originalName: before?.name || null, name: String(item.name).slice(0, 80), grams: Math.max(1, Number(item.grams) || 1), quantity: Math.max(.1, Number(item.quantity) || 1), previousGrams: before ? Number(before.grams) : null, at: new Date().toISOString() });
      });
      data.foodCalibration = data.foodCalibration.slice(-100);
    }
    return latest;
  });
  return Response.json({ ...userView(state, session.userId, session.role === "admin"), savedMealId, savedLocalDate, persistence: { idempotent, transactional: false, durationMs: Date.now() - startedAt } });
}

export async function DELETE(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { id } = await request.json();
  let undoId = "";
  const state = await updateState((latest) => { const meal = removeOwnedMeal(latest, session.userId, id); if (meal) { undoId = crypto.randomUUID(); latest.trash.push({ id: undoId, userId: session.userId, type: "meal", data: meal, deletedAt: new Date().toISOString() }); addAudit(latest, { userId: session.userId, action: "meal.deleted", target: id }); } return latest; });
  return Response.json({ ...userView(state, session.userId, session.role === "admin"), undoId });
}

export async function PATCH(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const id = String(body.id || "");
  const editedItems = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
  const editedNutrition = editedItems.length ? calculateMealFromItems(editedItems) : body;
  const editedValidation = validateMealNutrition({ ...editedNutrition, items: editedItems });
  const hasBlockingEditedNutritionIssue = editedValidation.issues.some((issue: { code?: string }) => ["photo", "voice"].includes(body.source) || issue.code === "implausible_energy_density");
  if (hasBlockingEditedNutritionIssue)
    return Response.json({ error: editedValidation.issues[0].message, issues: editedValidation.issues, requiresConfirmation: true }, { status: 422 });
  let foundMeal = false; let savedLocalDate = ""; let editConflict = false;
  const state = await updateState((latest) => {
    const found = findOwnedMeal(latest, session.userId, id); if (!found) return latest;
    foundMeal = true;
    const meal = found.meal;
    if (body.baseUpdatedAt !== undefined && String(meal.updatedAt || "") !== String(body.baseUpdatedAt || "")) { editConflict = true; return latest; }
    if (body.scale !== undefined) {
      const scale = Math.max(.25, Math.min(4, Number(body.scale) || 1));
      ["protein", "carbs", "fat"].forEach((field) => { meal[field] = Math.round(Number(meal[field] || 0) * scale * 10) / 10; });
      meal.kcal = roundCalories(Number(meal.kcal || 0) * scale);
      meal.items = (meal.items || []).map((item) => ({ ...item, quantity: Math.round(Number(item.quantity || 1) * scale * 100) / 100 }));
    } else {
      const name = String(body.name || "").trim(); const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
      const calculated = items.length ? calculateMealFromItems(items) : body;
      if (name) meal.name = name;
      meal.period = ["breakfast", "lunch", "dinner", "snack"].includes(body.period) ? body.period : meal.period;
      meal.kcal = roundCalories(calculated.kcal); meal.protein = Math.max(0, Number(calculated.protein) || 0); meal.carbs = Math.max(0, Number(calculated.carbs) || 0); meal.fat = Math.max(0, Number(calculated.fat) || 0); meal.sugar = Math.max(0, Number(calculated.sugar) || 0); meal.sugarTrackedItems = Math.max(0, Number(calculated.sugarTrackedItems) || 0); meal.items = items;
      meal.nutritionReliability = assessMealReliability({ ...body, ...calculated, items });
      const requested = new Date(body.occurredAt || meal.time); if (Number.isFinite(requested.getTime()) && requested.getTime() <= Date.now()) meal.time = requested.toISOString();
    }
    meal.score = calculateMealScore(meal); meal.updatedAt = new Date().toISOString();
    const previousDay = found.day; previousDay.meals = previousDay.meals.filter((item) => item.id !== id); restoreOwnedMeal(latest, session.userId, meal);
    savedLocalDate = localDateAt(meal.time, userTimeZone(ensureUserData(latest, session.userId)));
    addAudit(latest, { userId: session.userId, action: "meal.updated", target: id }); return latest;
  });
  if (!foundMeal) return Response.json({ error: "הארוחה לא נמצאה" }, { status: 404 });
  if (editConflict) return Response.json({ error: "הארוחה השתנתה במכשיר אחר. פתח אותה מחדש ובחר אילו שינויים לשמור.", conflict: true }, { status: 409 });
  return Response.json({ ...userView(state, session.userId, session.role === "admin"), savedMealId: id, savedLocalDate });
}
