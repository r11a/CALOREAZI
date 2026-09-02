function normalizedName(value = "") {
  return String(value).toLocaleLowerCase("he").replace(/[״׳'".,()\-_/]/g, " ").replace(/\s+/g, " ").trim();
}

function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function nutritionValue(object, field) {
  if (!Object.prototype.hasOwnProperty.call(object, field) || object[field] === "" || object[field] == null) return undefined;
  const number = Number(object[field]);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function buildFoodCorrections(originalItems = [], confirmedItems = [], source = "edit") {
  return confirmedItems.flatMap((item, index) => {
    const before = originalItems[index] || {};
    const changed = ["name", "grams", "quantity", "kcalPerUnit", "kcalPer100", "proteinPer100", "carbsPer100", "fatPer100"].some((key) => String(before[key] ?? "") !== String(item[key] ?? ""));
    if (!changed || !String(item.name || "").trim()) return [];
    return [{ originalName: String(before.name || item.name).trim().slice(0, 80), name: String(item.name).trim().slice(0, 80), grams: positive(item.grams) || 1, quantity: positive(item.quantity) || 1, previousGrams: positive(before.grams) || null, kcalPerUnit: nutritionValue(item, "kcalPerUnit"), kcalPer100: nutritionValue(item, "kcalPer100"), proteinPer100: nutritionValue(item, "proteinPer100"), carbsPer100: nutritionValue(item, "carbsPer100"), fatPer100: nutritionValue(item, "fatPer100"), learnedFrom: source, at: new Date().toISOString() }];
  });
}

export function applyFoodCorrections(items = [], corrections = []) {
  const recent = [...corrections].reverse();
  return items.map((item) => {
    const key = normalizedName(item.name);
    const learned = recent.find((entry) => key && [entry.originalName, entry.name].some((name) => normalizedName(name) === key));
    if (!learned) return item;
    const nutrition = Object.fromEntries(["kcalPerUnit", "kcalPer100", "proteinPer100", "carbsPer100", "fatPer100"].flatMap((field) => nutritionValue(learned, field) === undefined ? [] : [[field, nutritionValue(learned, field)]]));
    return { ...item, name: learned.name || item.name, grams: positive(learned.grams) || item.grams, quantity: positive(learned.quantity) || item.quantity, ...nutrition, ...(Object.keys(nutrition).length ? { nutritionStatus: "learned", nutritionSource: { source: "USER_CORRECTION", sourceId: `learned:${key}` } } : {}), learnedCorrection: true };
  });
}

export function findPossibleDuplicate(meals = [], candidate = {}, windowMinutes = 10) {
  const key = normalizedName(candidate.name);
  const time = new Date(candidate.time || candidate.occurredAt || Date.now()).getTime();
  if (!key || !Number.isFinite(time)) return null;
  return [...meals].reverse().find((meal) => normalizedName(meal.name) === key && Math.abs(time - new Date(meal.time).getTime()) <= windowMinutes * 60_000) || null;
}
