// Small, versioned bootstrap catalog. Values are standard reference values per
// 100 g and remain explicitly traceable. Production deployments can replace
// this adapter with a licensed national/USDA data import without changing the
// vision or meal APIs.
const foods = [
  ["chicken-breast-cooked", "חזה עוף", ["חזה עוף צלוי", "עוף", "chicken breast"], 165, 31, 0, 3.6, 0],
  ["chicken-thigh-cooked", "פרגית", ["ירך עוף", "chicken thigh"], 209, 26, 0, 10.9, 0],
  ["white-rice-cooked", "אורז לבן", ["אורז", "white rice"], 130, 2.7, 28.2, 0.3, 0.1],
  ["brown-rice-cooked", "אורז מלא", ["brown rice"], 123, 2.7, 25.6, 1, 0.2],
  ["potato-boiled", "תפוח אדמה", ["תפוחי אדמה", "potato"], 87, 1.9, 20.1, 0.1, 0.9],
  ["sweet-potato-cooked", "בטטה", ["sweet potato"], 90, 2, 20.7, 0.2, 6.5],
  ["salmon-cooked", "סלמון", ["salmon"], 206, 22.1, 0, 12.4, 0],
  ["tuna-water-drained", "טונה במים", ["טונה", "tuna"], 116, 25.5, 0, 0.8, 0],
  ["egg-whole-cooked", "ביצה", ["ביצה קשה", "egg"], 155, 12.6, 1.1, 10.6, 1.1],
  ["cottage-5", "קוטג׳ 5%", ["קוטג", "קוטג'", "cottage cheese"], 121, 11.5, 3, 5, 2.7],
  ["lentils-cooked", "עדשים", ["עדשים מבושלות", "lentils"], 116, 9, 20.1, 0.4, 1.8],
  ["chickpeas-cooked", "חומוס גרגירים", ["גרגרי חומוס", "chickpeas"], 164, 8.9, 27.4, 2.6, 4.8],
  ["tahini-raw", "טחינה גולמית", ["טחינה", "tahini"], 595, 17, 21.2, 53.8, 0.5],
  ["tomato", "עגבנייה", ["עגבניה", "tomato"], 18, 0.9, 3.9, 0.2, 2.6],
  ["cucumber", "מלפפון", ["cucumber"], 15, 0.7, 3.6, 0.1, 1.7],
  ["lettuce", "חסה", ["lettuce"], 15, 1.4, 2.9, 0.2, 0.8],
  ["avocado", "אבוקדו", ["avocado"], 160, 2, 8.5, 14.7, 0.7],
  ["apple", "תפוח", ["תפוח עץ", "apple"], 52, 0.3, 13.8, 0.2, 10.4],
  ["banana", "בננה", ["banana"], 89, 1.1, 22.8, 0.3, 12.2],
  ["orange", "תפוז", ["orange"], 47, 0.9, 11.8, 0.1, 9.4],
  ["coffee-black-brewed", "קפה שחור", ["אספרסו", "קפה ללא חלב", "black coffee", "brewed coffee", "espresso"], 2, 0.1, 0, 0, 0],
  ["coffee-with-milk", "קפה עם חלב", ["קפה הפוך", "לאטה", "קפוצ'ינו", "coffee with milk", "cafe latte", "cappuccino"], 36, 2, 3.6, 1.6, 3.6],
  ["tea-brewed", "תה", ["תה ללא סוכר", "black tea", "brewed tea"], 1, 0, 0.3, 0, 0],
].map(([sourceId, name, aliases, kcalPer100, proteinPer100, carbsPer100, fatPer100, sugarPer100]) => ({ source: "CALOREAZI_CURATED", sourceId, sourceVersion: "2026-08-21", name, aliases, kcalPer100, proteinPer100, carbsPer100, fatPer100, sugarPer100 }));

function normalize(value) { return String(value || "").toLocaleLowerCase("he").replace(/[׳'״".,()]/g, "").replace(/\s+/g, " ").trim(); }

export function findNutritionFood(name) {
  const target = normalize(name);
  if (!target) return null;
  const exact = foods.find((food) => [food.name, ...food.aliases].some((alias) => target === normalize(alias)));
  if (exact) return exact;
  return foods.map((food) => ({ food, match: [food.name, ...food.aliases].map(normalize).filter((candidate) => target.includes(candidate)).sort((a, b) => b.length - a.length)[0] }))
    .filter((item) => item.match).sort((a, b) => b.match.length - a.match.length)[0]?.food || null;
}

export function estimateMealSugar(meal) {
  if (Number(meal?.sugarTrackedItems || 0) > 0) return { sugar: Math.max(0, Number(meal.sugar || 0)), tracked: true };
  let sugar = 0; let trackedItems = 0;
  for (const item of meal?.items || []) {
    const sugarPer100 = item.sugarPer100 ?? findNutritionFood(item.name)?.sugarPer100;
    if (sugarPer100 === null || sugarPer100 === undefined) continue;
    sugar += Number(sugarPer100) * Math.max(0, Number(item.grams || 0)) * Math.max(0, Number(item.quantity || 1)) / 100;
    trackedItems += 1;
  }
  return { sugar: Math.round(sugar * 10) / 10, tracked: trackedItems > 0 };
}

export function enrichVisionItems(items) {
  let unmatched = 0;
  const enriched = items.map((item) => {
    const food = findNutritionFood(item.name);
    if (!food) { unmatched += 1; return { ...item, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0, sugarPer100: null, nutritionSource: null, nutritionStatus: "needs_confirmation" }; }
    return { ...item, kcalPer100: food.kcalPer100, proteinPer100: food.proteinPer100, carbsPer100: food.carbsPer100, fatPer100: food.fatPer100, sugarPer100: food.sugarPer100, nutritionSource: { source: food.source, sourceId: food.sourceId, sourceVersion: food.sourceVersion }, nutritionStatus: "matched" };
  });
  return { items: enriched, nutritionStatus: unmatched ? "needs_confirmation" : "matched", unmatched };
}

const usdaCache = new Map();
function nutrientValue(food, names) { const nutrient = (food.foodNutrients || []).find((item) => names.includes(String(item.nutrientName || item.nutrient?.name || "").toLowerCase())); return Math.max(0, Number(nutrient?.value ?? nutrient?.amount) || 0); }
export function energyKcal(food) { const nutrients = food.foodNutrients || []; const kcal = nutrients.find((item) => String(item.nutrientName || item.nutrient?.name || "").toLowerCase() === "energy" && String(item.unitName || item.nutrient?.unitName || "").toUpperCase() === "KCAL"); if (kcal) return Math.max(0, Number(kcal.value ?? kcal.amount) || 0); const kj = nutrients.find((item) => String(item.nutrientName || item.nutrient?.name || "").toLowerCase() === "energy" && String(item.unitName || item.nutrient?.unitName || "").toUpperCase() === "KJ"); return kj ? Math.max(0, (Number(kj.value ?? kj.amount) || 0) / 4.184) : 0; }
async function findUsdaFood(name) {
  const apiKey = process.env.CALOREAZI_USDA_API_KEY || "DEMO_KEY";
  const query = String(name || "").trim();
  if (!apiKey || !query) return null;
  const cacheKey = normalize(query); if (usdaCache.has(cacheKey)) return usdaCache.get(cacheKey);
  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, pageSize: 5, dataType: ["Foundation", "SR Legacy"] }), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`USDA FoodData Central returned ${response.status}`);
  const food = (await response.json()).foods?.[0];
  const result = food ? { source: "USDA_FDC", sourceId: String(food.fdcId), sourceVersion: food.publicationDate || "live", name: food.description, aliases: [], kcalPer100: energyKcal(food), proteinPer100: nutrientValue(food, ["protein"]), carbsPer100: nutrientValue(food, ["carbohydrate, by difference"]), fatPer100: nutrientValue(food, ["total lipid (fat)"]), sugarPer100: nutrientValue(food, ["sugars, total including nlea", "sugars, total"]) } : null;
  usdaCache.set(cacheKey, result); return result;
}

export async function enrichVisionItemsAuthoritative(items) {
  let unmatched = 0; const enriched = [];
  for (const item of items) {
    let food = findNutritionFood(item.name);
    if (!food) { try { food = await findUsdaFood(item.searchNameEn || item.name); } catch { food = null; } }
    if (!food || !(food.kcalPer100 > 0)) { unmatched += 1; enriched.push({ ...item, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0, sugarPer100: null, nutritionSource: null, nutritionStatus: "needs_confirmation" }); continue; }
    enriched.push({ ...item, kcalPer100: food.kcalPer100, proteinPer100: food.proteinPer100, carbsPer100: food.carbsPer100, fatPer100: food.fatPer100, sugarPer100: food.sugarPer100, nutritionSource: { source: food.source, sourceId: food.sourceId, sourceVersion: food.sourceVersion }, nutritionStatus: "matched" });
  }
  return { items: enriched, nutritionStatus: unmatched ? "needs_confirmation" : "matched", unmatched };
}

export function nutritionCatalog() { return structuredClone(foods); }
