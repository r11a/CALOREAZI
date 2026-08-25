const verificationPattern = /(בדוק|תבדוק|אשר|תאשר|לא בטוח|לא בטוחה|בערך|משוער|אולי)/i;

function normalizedNumber(value) {
  return Math.max(0, Number(String(value || "").replace(",", ".")) || 0);
}

export function explicitCalorieFacts(text = "") {
  const source = String(text || "").replace(/־/g, "-");
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
