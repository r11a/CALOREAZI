export const HYDRATION_BEVERAGES = [
  { id: "water", name: "מים", icon: "💧", factor: 1, defaultAmount: 250, fixed: true, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0 },
  { id: "sparkling", name: "סודה", icon: "🫧", factor: 1, defaultAmount: 250, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0 },
  { id: "tea", name: "תה ללא תוספות", icon: "🍵", factor: 1, defaultAmount: 250, kcalPer100: 1, proteinPer100: 0, carbsPer100: 0.3, fatPer100: 0 },
  { id: "coffee", name: "קפה שחור ללא תוספות", icon: "☕", factor: 0.95, defaultAmount: 200, kcalPer100: 2, proteinPer100: 0.1, carbsPer100: 0, fatPer100: 0 },
  { id: "milk", name: "חלב 3%", icon: "🥛", factor: 0.9, defaultAmount: 200, kcalPer100: 61, proteinPer100: 3.2, carbsPer100: 4.8, fatPer100: 3.3 },
  { id: "juice", name: "מיץ פרי", icon: "🧃", factor: 0.9, defaultAmount: 200, kcalPer100: 45, proteinPer100: 0.5, carbsPer100: 10.5, fatPer100: 0.1 },
  { id: "soft_drink", name: "משקה קל ממותק", icon: "🥤", factor: 0.9, defaultAmount: 250, kcalPer100: 42, proteinPer100: 0, carbsPer100: 10.6, fatPer100: 0 },
];

export function hydrationBeverage(id) { return HYDRATION_BEVERAGES.find((item) => item.id === id) || HYDRATION_BEVERAGES[0]; }
export function hydrationContribution(amount, beverageId = "water") { return Math.max(0, Math.round((Number(amount) || 0) * hydrationBeverage(beverageId).factor)); }
export function beverageNutrition(amount, beverageId = "water") { const beverage = hydrationBeverage(beverageId); const factor = Math.max(0, Number(amount) || 0) / 100; return { kcal: Math.round(beverage.kcalPer100 * factor), protein: Math.round(beverage.proteinPer100 * factor * 10) / 10, carbs: Math.round(beverage.carbsPer100 * factor * 10) / 10, fat: Math.round(beverage.fatPer100 * factor * 10) / 10 }; }
export function eventHydration(event) { return Math.max(0, Number(event?.hydrationMl ?? event?.amount) || 0); }
export function hydrationTotal(events = []) { return Math.round(events.reduce((sum, event) => sum + eventHydration(event), 0)); }
