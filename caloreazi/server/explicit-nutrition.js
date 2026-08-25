const verificationPattern = /(בדוק|תבדוק|אשר|תאשר|לא בטוח|לא בטוחה|בערך|משוער|אולי)/i;
const quantityWords = new Map([
  ["עשרים", 20], ["תשעה עשר", 19], ["תשע עשרה", 19], ["שמונה עשר", 18], ["שמונה עשרה", 18], ["שבעה עשר", 17], ["שבע עשרה", 17], ["שישה עשר", 16], ["שש עשרה", 16], ["חמישה עשר", 15], ["חמש עשרה", 15], ["ארבעה עשר", 14], ["ארבע עשרה", 14], ["שלושה עשר", 13], ["שלוש עשרה", 13], ["שנים עשר", 12], ["שתים עשרה", 12], ["אחד עשר", 11], ["אחת עשרה", 11], ["עשרה", 10], ["עשר", 10], ["תשעה", 9], ["תשע", 9], ["שמונה", 8], ["שבעה", 7], ["שבע", 7], ["שישה", 6], ["שש", 6], ["חמישה", 5], ["חמש", 5], ["ארבעה", 4], ["ארבע", 4], ["שלושה", 3], ["שלוש", 3], ["שניים", 2], ["שני", 2], ["שתיים", 2], ["שתי", 2], ["אחד", 1], ["אחת", 1],
]);

function normalizeQuantityWords(value) {
  let result = String(value || "");
  for (const [word, number] of [...quantityWords].sort((left, right) => right[0].length - left[0].length)) result = result.replace(new RegExp(`(?<!שכל)(?<!כל)(^|\\s)${word}(?=\\s)`, "g"), `$1${number}`);
  return result;
}

function normalizedNumber(value) {
  return Math.max(0, Number(String(value || "").replace(",", ".")) || 0);
}

export function explicitCalorieFacts(text = "") {
  const source = normalizeQuantityWords(String(text || "").replace(/־/g, "-"));
  const facts = [];
  const repeated = /(\d+(?:[.,]\d+)?)\s+([^\d,;.]{2,45}?)\s+(?:שכל\s+(?:אחד|אחת)(?:\s+מהם)?|כל\s+(?:אחד|אחת)|של)\s*(\d+(?:[.,]\d+)?)\s*(?:קלוריות|קלוריה|קל[׳'])/gi;
  for (const match of source.matchAll(repeated)) facts.push({ quantity: normalizedNumber(match[1]), name: match[2].trim(), kcalPerUnit: normalizedNumber(match[3]) });
  const single = /(?:^|[,;]|\sו)([^\d,;]{2,45}?)\s+(\d+(?:[.,]\d+)?)\s*(?:קלוריות|קלוריה|קל[׳'])/gi;
  for (const match of source.matchAll(single)) {
    const name = match[1].trim().replace(/^ו/, "").trim();
    if (!facts.some((fact) => fact.name.includes(name) || name.includes(fact.name))) facts.push({ quantity: 1, name, kcalPerUnit: normalizedNumber(match[2]) });
  }
  return facts.filter((fact) => fact.name && fact.kcalPerUnit > 0 && fact.quantity > 0);
}

function wordSet(value) {
  return new Set(String(value || "").replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/).filter((word) => word.length > 1));
}

export function applyExplicitCalorieFacts(text = "", items = []) {
  const facts = explicitCalorieFacts(text);
  if (!facts.length || verificationPattern.test(String(text || ""))) return { items, facts, enforced: false };
  const remaining = [...facts];
  const updated = items.map((item) => {
    const itemWords = wordSet(item.name);
    let bestIndex = -1; let bestScore = 0;
    remaining.forEach((fact, index) => {
      const score = [...wordSet(fact.name)].filter((word) => itemWords.has(word)).length;
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
    if (bestIndex < 0 && remaining.length === 1 && items.length === 1) bestIndex = 0;
    if (bestIndex < 0) return item;
    const fact = remaining.splice(bestIndex, 1)[0];
    return { ...item, quantity: fact.quantity, kcalPerUnit: fact.kcalPerUnit, calorieBasis: "unit", explicitCalories: true };
  });
  return { items: updated, facts, enforced: true };
}
