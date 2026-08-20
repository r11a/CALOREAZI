// Small, versioned bootstrap catalog. Values are standard reference values per
// 100 g and remain explicitly traceable. Production deployments can replace
// this adapter with a licensed national/USDA data import without changing the
// vision or meal APIs.
const foods = [
  ["chicken-breast-cooked", "חזה עוף", ["חזה עוף צלוי", "עוף", "chicken breast"], 165, 31, 0, 3.6],
  ["chicken-thigh-cooked", "פרגית", ["ירך עוף", "chicken thigh"], 209, 26, 0, 10.9],
  ["white-rice-cooked", "אורז לבן", ["אורז", "white rice"], 130, 2.7, 28.2, 0.3],
  ["brown-rice-cooked", "אורז מלא", ["brown rice"], 123, 2.7, 25.6, 1],
  ["potato-boiled", "תפוח אדמה", ["תפוחי אדמה", "potato"], 87, 1.9, 20.1, 0.1],
  ["sweet-potato-cooked", "בטטה", ["sweet potato"], 90, 2, 20.7, 0.2],
  ["salmon-cooked", "סלמון", ["salmon"], 206, 22.1, 0, 12.4],
  ["tuna-water-drained", "טונה במים", ["טונה", "tuna"], 116, 25.5, 0, 0.8],
  ["egg-whole-cooked", "ביצה", ["ביצה קשה", "egg"], 155, 12.6, 1.1, 10.6],
  ["cottage-5", "קוטג׳ 5%", ["קוטג", "קוטג'", "cottage cheese"], 121, 11.5, 3, 5],
  ["lentils-cooked", "עדשים", ["עדשים מבושלות", "lentils"], 116, 9, 20.1, 0.4],
  ["chickpeas-cooked", "חומוס גרגירים", ["גרגרי חומוס", "chickpeas"], 164, 8.9, 27.4, 2.6],
  ["tahini-raw", "טחינה גולמית", ["טחינה", "tahini"], 595, 17, 21.2, 53.8],
  ["tomato", "עגבנייה", ["עגבניה", "tomato"], 18, 0.9, 3.9, 0.2],
  ["cucumber", "מלפפון", ["cucumber"], 15, 0.7, 3.6, 0.1],
  ["lettuce", "חסה", ["lettuce"], 15, 1.4, 2.9, 0.2],
  ["avocado", "אבוקדו", ["avocado"], 160, 2, 8.5, 14.7],
  ["apple", "תפוח", ["תפוח עץ", "apple"], 52, 0.3, 13.8, 0.2],
  ["banana", "בננה", ["banana"], 89, 1.1, 22.8, 0.3],
  ["orange", "תפוז", ["orange"], 47, 0.9, 11.8, 0.1],
].map(([sourceId, name, aliases, kcalPer100, proteinPer100, carbsPer100, fatPer100]) => ({ source: "CALOREAZI_CURATED", sourceId, sourceVersion: "2026-08-20", name, aliases, kcalPer100, proteinPer100, carbsPer100, fatPer100 }));

function normalize(value) { return String(value || "").toLocaleLowerCase("he").replace(/[׳'״".,()]/g, "").replace(/\s+/g, " ").trim(); }

export function findNutritionFood(name) {
  const target = normalize(name);
  if (!target) return null;
  return foods.find((food) => [food.name, ...food.aliases].some((alias) => {
    const candidate = normalize(alias);
    return target === candidate || target.includes(candidate) || candidate.includes(target);
  })) || null;
}

export function enrichVisionItems(items) {
  let unmatched = 0;
  const enriched = items.map((item) => {
    const food = findNutritionFood(item.name);
    if (!food) { unmatched += 1; return { ...item, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0, nutritionSource: null, nutritionStatus: "needs_confirmation" }; }
    return { ...item, kcalPer100: food.kcalPer100, proteinPer100: food.proteinPer100, carbsPer100: food.carbsPer100, fatPer100: food.fatPer100, nutritionSource: { source: food.source, sourceId: food.sourceId, sourceVersion: food.sourceVersion }, nutritionStatus: "matched" };
  });
  return { items: enriched, nutritionStatus: unmatched ? "needs_confirmation" : "matched", unmatched };
}

const usdaCache = new Map();
function nutrientValue(food, names) { const nutrient = (food.foodNutrients || []).find((item) => names.includes(String(item.nutrientName || item.nutrient?.name || "").toLowerCase())); return Math.max(0, Number(nutrient?.value ?? nutrient?.amount) || 0); }
async function findUsdaFood(name) {
  const apiKey = process.env.CALOREAZI_USDA_API_KEY || "DEMO_KEY";
  const query = String(name || "").trim();
  if (!apiKey || !query) return null;
  const cacheKey = normalize(query); if (usdaCache.has(cacheKey)) return usdaCache.get(cacheKey);
  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, pageSize: 5, dataType: ["Foundation", "SR Legacy"] }), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`USDA FoodData Central returned ${response.status}`);
  const food = (await response.json()).foods?.[0];
  const result = food ? { source: "USDA_FDC", sourceId: String(food.fdcId), sourceVersion: food.publicationDate || "live", name: food.description, aliases: [], kcalPer100: nutrientValue(food, ["energy"]), proteinPer100: nutrientValue(food, ["protein"]), carbsPer100: nutrientValue(food, ["carbohydrate, by difference"]), fatPer100: nutrientValue(food, ["total lipid (fat)"]) } : null;
  usdaCache.set(cacheKey, result); return result;
}

export async function enrichVisionItemsAuthoritative(items) {
  let unmatched = 0; const enriched = [];
  for (const item of items) {
    let food = findNutritionFood(item.name);
    if (!food) { try { food = await findUsdaFood(item.searchNameEn || item.name); } catch { food = null; } }
    if (!food || !(food.kcalPer100 > 0)) { unmatched += 1; enriched.push({ ...item, kcalPer100: 0, proteinPer100: 0, carbsPer100: 0, fatPer100: 0, nutritionSource: null, nutritionStatus: "needs_confirmation" }); continue; }
    enriched.push({ ...item, kcalPer100: food.kcalPer100, proteinPer100: food.proteinPer100, carbsPer100: food.carbsPer100, fatPer100: food.fatPer100, nutritionSource: { source: food.source, sourceId: food.sourceId, sourceVersion: food.sourceVersion }, nutritionStatus: "matched" });
  }
  return { items: enriched, nutritionStatus: unmatched ? "needs_confirmation" : "matched", unmatched };
}

export function nutritionCatalog() { return structuredClone(foods); }
