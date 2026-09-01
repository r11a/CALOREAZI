const FOOD_DATA_USER_AGENT = "CALOREAZI food image cache (https://github.com/r11a/CALOREAZI)";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const normalizeFoodImageName = (value) => String(value || "").toLocaleLowerCase("he-IL").replace(/[׳'״".,()\-]/g, " ").replace(/\s+/g, " ").trim();

export function categoryArtwork(candidates = []) {
  const text = candidates.map(normalizeFoodImageName).join(" ");
  if (/מים|קפה|תה|משקה|מיץ|חלב|שייק|קולה|סודה/.test(text)) return "category-drinks-v1.png";
  if (/תפוח|אגס|שזיף|בננה|תפוז|קלמנטינה|אבטיח|מלון|ענב|תות|מנגו|אפרסק|נקטרינה|קיווי|אננס|פרי/.test(text)) return "category-fruits-v1.png";
  if (/עגבני|מלפפון|פלפל|גזר|חסה|כרוב|בצל|קישוא|חציל|ברוקולי|כרובית|ירק|סלט/.test(text)) return "category-vegetables-v1.png";
  return "";
}

function matchScore(candidate, productName) {
  const a = normalizeFoodImageName(candidate); const b = normalizeFoodImageName(productName);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) >= 4 ? 80 : 0;
  const words = a.split(" ").filter((word) => word.length > 2); const productWords = new Set(b.split(" "));
  return words.length ? Math.round((words.filter((word) => productWords.has(word)).length / words.length) * 70) : 0;
}

export async function findOpenFoodImage(candidates = []) {
  for (const candidate of candidates.map(normalizeFoodImageName).filter((value) => value.length >= 3).slice(0, 3)) {
    const params = new URLSearchParams({ search_terms: candidate, search_simple: "1", action: "process", json: "1", page_size: "8", fields: "product_name,product_name_he,image_front_small_url" });
    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, { headers: { "User-Agent": FOOD_DATA_USER_AGENT }, signal: AbortSignal.timeout(4500), next: { revalidate: 2592000 } });
      if (!response.ok) continue;
      const payload = await response.json();
      const matches = (Array.isArray(payload?.products) ? payload.products : []).map((product) => ({ name: String(product.product_name_he || product.product_name || ""), image: String(product.image_front_small_url || "") })).filter((product) => product.image).map((product) => ({ ...product, score: matchScore(candidate, product.name) })).sort((a, b) => b.score - a.score);
      if (matches[0]?.score >= 70) return { image: matches[0].image, source: "open_food_facts", matchedName: matches[0].name };
    } catch { /* A missing product image must never delay or block saving a meal. */ }
  }
  return null;
}

export function cachedImage(state, candidates = []) {
  const cache = state.systemSettings?.foodImageCache || {};
  for (const candidate of candidates) {
    const entry = cache[normalizeFoodImageName(candidate)];
    if (entry?.image && Date.now() - new Date(entry.cachedAt || 0).getTime() < CACHE_TTL_MS) return entry;
  }
  return null;
}

export function rememberImage(state, candidates, result) {
  state.systemSettings ||= {}; state.systemSettings.foodImageCache ||= {};
  const cache = state.systemSettings.foodImageCache;
  for (const candidate of candidates) { const key = normalizeFoodImageName(candidate); if (key) cache[key] = { ...result, cachedAt: new Date().toISOString() }; }
  const entries = Object.entries(cache).sort((a, b) => new Date(b[1]?.cachedAt || 0).getTime() - new Date(a[1]?.cachedAt || 0).getTime());
  state.systemSettings.foodImageCache = Object.fromEntries(entries.slice(0, 500));
}
