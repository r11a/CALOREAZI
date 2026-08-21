const entries = new Map();
const MAX_ENTRIES = 300;

export function cachedFoodSearch(key) {
  const entry = entries.get(key);
  if (!entry || entry.expiresAt <= Date.now()) { entries.delete(key); return null; }
  entries.delete(key); entries.set(key, entry);
  return structuredClone(entry.value);
}

export function cacheFoodSearch(key, value, ttlMs = 60 * 60 * 1000) {
  entries.delete(key); entries.set(key, { value: structuredClone(value), expiresAt: Date.now() + ttlMs });
  while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
  return value;
}

export function clearFoodSearchCache() { entries.clear(); }
