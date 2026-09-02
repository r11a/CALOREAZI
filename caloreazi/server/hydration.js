export const HYDRATION_BEVERAGES = [
  { id: "water", name: "מים", icon: "💧", color: "#55b7ea", factor: 1, defaultAmount: 250, fixed: true, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0 },
  { id: "black_coffee", name: "קפה שחור", icon: "☕", color: "#9a6445", factor: .95, defaultAmount: 200, kcalPer100: 2, proteinPer100: .1, carbsPer100: 0, fatPer100: 0 },
  { id: "milk_coffee", name: "קפה עם חלב", icon: "☕", color: "#bd8b69", factor: .9, defaultAmount: 200, kcalPer100: 30, proteinPer100: 1.6, carbsPer100: 2.4, fatPer100: 1.7 },
  { id: "chocolate_milk", name: "שוקו", icon: "🥛", color: "#81543d", factor: .85, defaultAmount: 200, kcalPer100: 78, proteinPer100: 3.2, carbsPer100: 12.5, fatPer100: 2.3 },
  { id: "cocoa", name: "קקאו עם חלב", icon: "🫖", color: "#a76f4f", factor: .85, defaultAmount: 200, kcalPer100: 65, proteinPer100: 3.4, carbsPer100: 7.5, fatPer100: 2.8 },
  { id: "green_tea", name: "תה ירוק", icon: "🍵", color: "#68a56f", factor: 1, defaultAmount: 250, kcalPer100: 1, proteinPer100: 0, carbsPer100: .3, fatPer100: 0 },
  { id: "herbal_tea", name: "תה צמחים", icon: "🌿", color: "#81b77a", factor: 1, defaultAmount: 250, kcalPer100: 1, proteinPer100: 0, carbsPer100: .3, fatPer100: 0 },
  { id: "soft_drink", name: "משקה קל ממותק", icon: "🥤", color: "#8977d1", factor: .9, defaultAmount: 250, kcalPer100: 42, proteinPer100: 0, carbsPer100: 10.6, fatPer100: 0 },
  { id: "wine", name: "יין", icon: "🍷", color: "#a64667", factor: .8, defaultAmount: 150, kcalPer100: 85, proteinPer100: .1, carbsPer100: 2.6, fatPer100: 0 },
  { id: "sparkling", name: "סודה", icon: "🫧", color: "#78b9d2", factor: 1, defaultAmount: 250, legacy: true, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0 },
  { id: "tea", name: "תה ללא תוספות", icon: "🍵", color: "#70a975", factor: 1, defaultAmount: 250, legacy: true, kcalPer100: 1, proteinPer100: 0, carbsPer100: .3, fatPer100: 0 },
  { id: "coffee", name: "קפה שחור ללא תוספות", icon: "☕", color: "#9a6445", factor: .95, defaultAmount: 200, legacy: true, kcalPer100: 2, proteinPer100: .1, carbsPer100: 0, fatPer100: 0 },
  { id: "milk", name: "חלב 3%", icon: "🥛", color: "#d9e2e8", factor: .9, defaultAmount: 200, legacy: true, kcalPer100: 61, proteinPer100: 3.2, carbsPer100: 4.8, fatPer100: 3.3 },
  { id: "juice", name: "מיץ פרי", icon: "🧃", color: "#f0a33c", factor: .9, defaultAmount: 200, legacy: true, kcalPer100: 45, proteinPer100: .5, carbsPer100: 10.5, fatPer100: .1 },
];

export function normalizeCustomBeverage(input = {}) { const rawId = String(input.id || `custom_${crypto.randomUUID()}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80); const id = rawId.startsWith("custom_") ? rawId : `custom_${rawId}`; return { id, name: String(input.name || "משקה מותאם").trim().slice(0, 60), icon: "🥤", color: String(input.color || "#e47a48").slice(0, 20), factor: Math.max(.5, Math.min(1, Number(input.factor) || .9)), defaultAmount: Math.max(50, Math.min(1000, Math.round(Number(input.defaultAmount) || 250))), kcalPer100: Math.max(0, Math.min(900, Number(input.kcalPer100) || 0)), proteinPer100: Math.max(0, Math.min(100, Number(input.proteinPer100) || 0)), carbsPer100: Math.max(0, Math.min(100, Number(input.carbsPer100) || 0)), fatPer100: Math.max(0, Math.min(100, Number(input.fatPer100) || 0)), custom: true }; }
export function hydrationBeverage(id, custom = []) { return [...HYDRATION_BEVERAGES, ...custom.map(normalizeCustomBeverage)].find((item) => item.id === id) || HYDRATION_BEVERAGES[0]; }
export function hydrationContribution(amount, beverageId = "water", custom = []) { return Math.max(0, Math.round((Number(amount) || 0) * hydrationBeverage(beverageId, custom).factor)); }
export function beverageNutrition(amount, beverageId = "water", custom = []) { const beverage = hydrationBeverage(beverageId, custom); const factor = Math.max(0, Number(amount) || 0) / 100; return { kcal: Math.round(beverage.kcalPer100 * factor), protein: Math.round(beverage.proteinPer100 * factor * 10) / 10, carbs: Math.round(beverage.carbsPer100 * factor * 10) / 10, fat: Math.round(beverage.fatPer100 * factor * 10) / 10 }; }
export function eventHydration(event) { return Math.max(0, Number(event?.hydrationMl ?? event?.amount) || 0); }
export function hydrationTotal(events = []) { return Math.round(events.reduce((sum, event) => sum + eventHydration(event), 0)); }

export function inferHydrationBeverage(name, custom = []) {
  const value = String(name || "").toLocaleLowerCase();
  const customMatch = custom.map(normalizeCustomBeverage).find((item) => value.includes(item.name.toLocaleLowerCase()));
  if (customMatch) return customMatch;
  const rules = [
    ["milk_coffee", /קפה.*חלב|נס קפה|קפוצ׳ינו|קפוצ'ינו|לאטה|cappuccino|latte/],
    ["black_coffee", /קפה שחור|אספרסו|אמריקנו|espresso|americano/],
    ["chocolate_milk", /שוקו|chocolate milk/],
    ["cocoa", /קקאו|cocoa/],
    ["green_tea", /תה ירוק|green tea/],
    ["herbal_tea", /תה צמחים|חליטה|herbal tea/],
    ["soft_drink", /קולה|ספרייט|פאנטה|משקה קל|cola|soda|soft drink/],
    ["wine", /יין|wine/],
    ["juice", /מיץ|juice/],
    ["milk", /(?:^|\s)חלב(?:\s|$)|(?:^|\s)milk(?:\s|$)/],
    ["tea", /(?:^|\s)תה(?:\s|$)|(?:^|\s)tea(?:\s|$)/],
    ["coffee", /(?:^|\s)קפה(?:\s|$)|(?:^|\s)coffee(?:\s|$)/],
    ["sparkling", /סודה|מים מוגזים|sparkling water/],
    ["water", /(?:^|\s)כוס מים(?:\s|$)|(?:^|\s)מים(?:\s|$)|(?:^|\s)water(?:\s|$)/],
  ];
  const match = rules.find(([, pattern]) => pattern.test(value));
  return match ? hydrationBeverage(match[0], custom) : null;
}

export function backfillDayHydration(day, custom = []) {
  if (!day || !Array.isArray(day.meals)) return 0;
  day.waterEvents = Array.isArray(day.waterEvents) ? day.waterEvents : [];
  if (!day.waterEvents.length && Number(day.waterMl || 0) > 0) day.waterEvents.push({ id: `legacy-water-${day.date}`, amount: Number(day.waterMl), hydrationMl: Number(day.waterMl), beverageId: "water", beverageName: "מים", icon: "💧", legacyAggregate: true, time: `${day.date}T12:00:00.000Z` });
  let added = 0;
  for (const meal of day.meals) {
    if (meal.beverageEntry || day.waterEvents.some((event) => event.sourceMealId === meal.id || event.mealId === meal.id)) continue;
    const beverage = inferHydrationBeverage([meal.name, ...(meal.items || []).map((item) => item.name)].join(" "), custom);
    if (!beverage) continue;
    const itemAmount = (meal.items || []).filter((item) => inferHydrationBeverage(item.name, custom)?.id === beverage.id).reduce((sum, item) => sum + Math.max(0, Number(item.grams) || 0) * Math.max(.1, Number(item.quantity) || 1), 0);
    const amount = Math.max(50, Math.min(2000, Math.round(itemAmount || Number(meal.amountMl) || beverage.defaultAmount)));
    day.waterEvents.push({ id: `meal-drink-${meal.id}`, sourceMealId: meal.id, amount, hydrationMl: hydrationContribution(amount, beverage.id, custom), beverageId: beverage.id, beverageName: beverage.name, icon: beverage.icon, time: meal.time || `${day.date}T12:00:00.000Z`, inferredFromHistory: true });
    added += 1;
  }
  if (day.waterEvents.length) day.waterMl = hydrationTotal(day.waterEvents);
  return added;
}
