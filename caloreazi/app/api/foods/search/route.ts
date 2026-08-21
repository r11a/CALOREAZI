import { requireUser } from "@/server/auth.js";
import { readState } from "@/server/store.js";
import { cacheFoodSearch, cachedFoodSearch } from "@/server/food-search-cache.js";
import { nutritionConfidence } from "@/server/meal-validation.js";

export const runtime = "nodejs";

type OpenFoodProduct = {
  code?: string; product_name?: string; product_name_he?: string; brands?: string;
  quantity?: string; image_front_small_url?: string; nutriments?: Record<string, number | string>;
};

function withTrust<T extends Record<string, unknown>>(product: T) {
  return { ...product, confidence: nutritionConfidence(product), verifiedAt: new Date().toISOString() };
}

export async function GET(request: Request) {
  const state = await readState();
  if (!requireUser(state, request)) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const url = new URL(request.url);
  const barcode = (url.searchParams.get("barcode") || "").replace(/\D/g, "").slice(0, 14);
  if (barcode.length >= 8) {
    const cacheKey = `barcode:${barcode}`;
    const cached = cachedFoodSearch(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true }, { headers: { "Cache-Control": "private, max-age=86400" } });
    for (const host of ["world.openfoodfacts.org", "world.openfoodfacts.net"]) {
      try {
        const response = await fetch(`https://${host}/api/v2/product/${barcode}.json?fields=code,product_name,product_name_he,brands,quantity,image_front_small_url,nutriments`, { headers: { "User-Agent": "CALOREAZI/1.9.0 (https://github.com/r11a/CALOREAZI)" }, signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
        if (!response.ok || !response.headers.get("content-type")?.includes("json")) continue;
        const payload = await response.json();
        const product = payload.product as OpenFoodProduct | undefined;
        if (!product) continue;
        const nutrients = product.nutriments || {};
        const kcal = Number(nutrients["energy-kcal_100g"] || (Number(nutrients.energy_100g || 0) / 4.184));
        const result = { product: withTrust({ id: `off-${barcode}`, barcode, name: String(product.product_name_he || product.product_name || `מוצר ${barcode}`).trim(), brand: String(product.brands || "").trim(), portion: String(product.quantity || "ערכים ל־100 גרם"), image: String(product.image_front_small_url || ""), basis: "100g", kcal: Math.round(kcal || 0), protein: Number(nutrients.proteins_100g || 0), carbs: Number(nutrients.carbohydrates_100g || 0), fat: Number(nutrients.fat_100g || 0), source: "Open Food Facts" }), attribution: "Open Food Facts · זיהוי לפי ברקוד" };
        cacheFoodSearch(cacheKey, result, 24 * 60 * 60 * 1000);
        return Response.json(result, { headers: { "Cache-Control": "private, max-age=86400" } });
      } catch { /* Try alternate host. */ }
    }
    return Response.json({ error: "הברקוד לא נמצא במאגר" }, { status: 404 });
  }
  const query = url.searchParams.get("q")?.trim().slice(0, 80) || "";
  if (query.length < 2) return Response.json({ products: [] });
  const queryCacheKey = `query:${query.toLocaleLowerCase("he")}`;
  const cachedQuery = cachedFoodSearch(queryCacheKey);
  if (cachedQuery) return Response.json({ ...cachedQuery, cached: true }, { headers: { "Cache-Control": "private, max-age=3600" } });
  try {
    const governmentParams = new URLSearchParams({ resource_id: "c3cb0630-0650-46c1-a068-82d575c094b2", q: query, limit: "24" });
    const governmentResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?${governmentParams}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
    if (governmentResponse.ok) {
      const governmentPayload = await governmentResponse.json();
      const records = Array.isArray(governmentPayload?.result?.records) ? governmentPayload.result.records : [];
      const products = records.map((record: Record<string, unknown>) => withTrust({
        id: `moh-${String(record.Code || record._id || "")}`,
        name: String(record.shmmitzrach || "").trim(),
        brand: "מאגר התזונה הלאומי הישראלי",
        portion: "ערכים ל־100 גרם",
        image: "",
        basis: "100g",
        kcal: Math.round(Number(record.food_energy || 0)),
        protein: Number(record.protein || 0),
        carbs: Number(record.carbohydrates || 0),
        fat: Number(record.total_fat || 0),
        source: "משרד הבריאות",
      })).filter((product: { name: string; kcal: number }) => product.name && product.kcal > 0);
      if (products.length) { const result = { products, attribution: "משרד הבריאות · מאגר התזונה הלאומי הישראלי" }; cacheFoodSearch(queryCacheKey, result, 24 * 60 * 60 * 1000); return Response.json(result, { headers: { "Cache-Control": "private, max-age=86400" } }); }
    }
  } catch { /* Continue to the wider packaged-products source. */ }
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "16",
    fields: "code,product_name,product_name_he,brands,quantity,image_front_small_url,nutriments,nutrition_data_per",
  });
  let payload: { products?: OpenFoodProduct[] } | null = null;
  for (const host of ["world.openfoodfacts.org", "world.openfoodfacts.net"]) {
    try {
      const response = await fetch(`https://${host}/cgi/search.pl?${params}`, {
        headers: { "User-Agent": "CALOREAZI/1.9.0 (https://github.com/r11a/CALOREAZI)" },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 3600 },
      });
      if (response.ok && response.headers.get("content-type")?.includes("json")) { payload = await response.json(); break; }
    } catch { /* Try the documented alternate host before reporting an outage. */ }
  }
  if (!payload) return Response.json({ error: "מאגר המוצרים אינו זמין כרגע" }, { status: 502 });
  const products = ((Array.isArray(payload.products) ? payload.products : []) as OpenFoodProduct[]).map((product) => {
    const nutrients = product.nutriments || {};
    const kcal = Number(nutrients["energy-kcal_100g"] || (Number(nutrients.energy_100g || 0) / 4.184));
    return withTrust({
      id: `off-${product.code}`,
      barcode: String(product.code || ""),
      name: String(product.product_name_he || product.product_name || "").trim(),
      brand: String(product.brands || "").trim(),
      portion: String(product.quantity || "ערכים ל־100 גרם"),
      image: String(product.image_front_small_url || ""),
      basis: "100g",
      kcal: Math.round(kcal || 0),
      protein: Number(nutrients.proteins_100g || 0),
      carbs: Number(nutrients.carbohydrates_100g || 0),
      fat: Number(nutrients.fat_100g || 0),
      source: "Open Food Facts",
    });
  }).filter((product) => product.name && product.kcal > 0 && /[\u0590-\u05ff]/.test(product.name));
  const result = { products, attribution: "Open Food Facts · תוצאות בעלות שם עברי בלבד" };
  cacheFoodSearch(queryCacheKey, result);
  return Response.json(result, { headers: { "Cache-Control": "private, max-age=3600" } });
}
