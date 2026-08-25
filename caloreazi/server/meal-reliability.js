import { calculateMealFromItems } from "./nutrition.js";
import { validateMealNutrition } from "./meal-validation.js";

const sourceProfiles = [
  { test: (value) => value.includes("משרד הבריאות") || value.includes("MOH"), score: 96, label: "מאגר התזונה הלאומי הישראלי" },
  { test: (value) => value.includes("CALOREAZI_CURATED"), score: 92, label: "קטלוג CALOREAZI מאומת" },
  { test: (value) => value.includes("USDA"), score: 89, label: "מאגר USDA" },
  { test: (value) => value.includes("Open Food Facts"), score: 80, label: "מאגר ברקודים קהילתי" },
  { test: (value) => value.includes("AI_ESTIMATE"), score: 58, label: "הערכת AI" },
];
function clamp(value, min = 0, max = 100) { return Math.max(min, Math.min(max, value)); }
function rounded(value, digits = 0) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }
function itemCalories(item) { const quantity = Math.max(.1, Number(item?.quantity) || 1); return Number(item?.kcalPerUnit) > 0 ? Number(item.kcalPerUnit) * quantity : Math.max(0, Number(item?.kcalPer100) || 0) * Math.max(0, Number(item?.grams) || 0) * quantity / 100; }
function sourceProfile(item) { if (item?.explicitCalories === true && Number(item?.kcalPerUnit) > 0) return { score: 99, label: "ערך מפורש שהוזן על ידך" }; const source = String(item?.nutritionSource?.source || item?.source || ""); return sourceProfiles.find((profile) => profile.test(source)) || (Number(item?.kcalPer100) > 0 || Number(item?.kcalPerUnit) > 0 ? { score: 72, label: "ערך תזונתי ללא מקור מאומת" } : { score: 20, label: "חסר ערך תזונתי" }); }

export function assessMealReliability(input = {}) {
  const items = Array.isArray(input.items) ? input.items.slice(0, 30) : [];
  if (!items.length) { const exact = input.explicitCalories === true || input.source === "manual"; return { score: exact ? 88 : 48, level: exact ? "high" : "low", label: exact ? "ערך ארוחה שהוזן ידנית" : "לא ניתן לאמת את פירוט הארוחה", coverage: 0, items: [], issues: [] }; }
  const validation = validateMealNutrition({ ...calculateMealFromItems(items), items });
  const auditedItems = items.map((item) => {
    const source = sourceProfile(item); const hasCalories = Number(item.kcalPerUnit) > 0 || Number(item.kcalPer100) > 0; const hasWeight = Number(item.grams) > 0; const hasQuantity = Number(item.quantity) > 0; const calories = itemCalories(item); let score = source.score;
    if (!hasCalories) score -= 45; if (!hasWeight && !Number(item.kcalPerUnit)) score -= 30; if (!hasQuantity) score -= 10; if (["photo", "voice"].includes(String(input.source || "")) && item.explicitCalories !== true) score -= input.source === "photo" ? 12 : 6; if (item.nutritionStatus === "needs_confirmation") score -= 25;
    const basis = Number(item.kcalPerUnit) > 0 ? "unit" : "100g"; const quantity = Math.max(.1, Number(item.quantity) || 1); const formula = basis === "unit" ? `${rounded(Number(item.kcalPerUnit), 1)} × ${rounded(quantity, 2)} = ${Math.round(calories)} קק״ל` : `${rounded(Number(item.kcalPer100), 1)} ל־100 גרם × ${rounded(Number(item.grams) * quantity, 1)} גרם = ${Math.round(calories)} קק״ל`;
    return { name: String(item.name || "פריט"), calories: Math.round(calories), score: clamp(Math.round(score)), source: source.label, basis, formula };
  });
  const calorieTotal = auditedItems.reduce((sum, item) => sum + item.calories, 0); const weightedScore = auditedItems.reduce((sum, item) => sum + item.score * (calorieTotal > 0 ? item.calories / calorieTotal : 1 / auditedItems.length), 0); const coverage = Math.round(auditedItems.filter((item) => item.calories > 0).length / auditedItems.length * 100); const penalty = validation.issues.length * 10 + (coverage < 100 ? 15 : 0); const score = clamp(Math.round(weightedScore - penalty)); const level = score >= 88 ? "high" : score >= 68 ? "medium" : "low";
  return { score, level, label: level === "high" ? "אמינות גבוהה" : level === "medium" ? "אמינות טובה — מומלץ לעבור על הכמויות" : "נדרשת בדיקה לפני שמירה", coverage, items: auditedItems, issues: validation.issues };
}
