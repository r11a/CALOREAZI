const beveragePattern = /(קפה|אספרסו|לאטה|קפוצ.?ינו|תה|שוקו|coffee|espresso|latte|cappuccino|tea|cocoa)/i;
const energyDensePattern = /(עוגה|עוגת|ביסקוויט|עוגייה|עוגיות|שוקולד|קרמל|cake|cookie|biscuit|chocolate|caramel)/i;
const freshProducePattern = /(עגבני|מלפפון|חסה|גזר|פלפל|ברוקולי|קישוא|כרובית|תפוח(?:\s|$)|בננה|תפוז|מנגו|שזיף|מלון|אשכולית|אבטיח|קיווי|אפרסק|tomato|cucumber|lettuce|carrot|pepper|broccoli|zucchini|apple|banana|orange|mango|plum|melon|grapefruit|watermelon|kiwi|peach)/i;
const processedProducePattern = /(מיובש|מטוגן|צ.?יפס|ריבה|מסוכר|רוטב|ממרח|dried|sun.?dried|fried|chips|jam|candied|sauce|paste)/i;

export function validateMealNutrition(input = {}) {
  const items = Array.isArray(input.items) ? input.items : [];
  const issues = [];
  const kcal = Math.max(0, Number(input.kcal) || 0);
  const macroKcal = Math.max(0, Number(input.protein) || 0) * 4 + Math.max(0, Number(input.carbs) || 0) * 4 + Math.max(0, Number(input.fat) || 0) * 9;
  const hasExplicitCalories = items.some((item) => item.explicitCalories === true && Number(item.kcalPerUnit) > 0);
  if (!hasExplicitCalories && kcal > 0 && macroKcal > 0 && Math.abs(kcal - macroKcal) / Math.max(kcal, macroKcal) > .35)
    issues.push({ code: "macro_calorie_mismatch", message: "הקלוריות אינן תואמות לערכי החלבון, הפחמימות והשומן. יש לבדוק את הערכים." });
  for (const item of items) {
    const name = String(item.name || "");
    const grams = Math.max(0, Number(item.grams) || 0) * Math.max(.1, Number(item.quantity) || 1);
    const per100 = Math.max(0, Number(item.kcalPer100) || 0);
    const servingKcal = Number(item.kcalPerUnit) > 0 ? Number(item.kcalPerUnit) * Math.max(.1, Number(item.quantity) || 1) : grams * per100 / 100;
    const itemMacroKcal = Math.max(0, Number(item.proteinPer100) || 0) * 4 + Math.max(0, Number(item.carbsPer100) || 0) * 4 + Math.max(0, Number(item.fatPer100) || 0) * 9;
    if (grams > 3000 || per100 > 950 || servingKcal > 2500)
      issues.push({ code: "implausible_portion", item: name, message: `הכמות או הערך של ${name || "הפריט"} אינם סבירים.` });
    if (beveragePattern.test(name) && (grams > 750 || servingKcal > 300))
      issues.push({ code: "implausible_beverage", item: name, message: "זוהה חישוב לא סביר למשקה. בדוק את הסוג, הכמות והתוספות." });
    if (item.explicitCalories !== true && !Number(item.kcalPerUnit) && energyDensePattern.test(name) && grams >= 80 && grams <= 150 && per100 > 0 && per100 < 120)
      issues.push({ code: "implausible_energy_density", item: name, message: `הערך הקלורי של ${name || "הפריט"} נמוך באופן חריג. יש לבדוק אם הערך הוא ליחידה או ל־100 גרם.` });
    if (item.explicitCalories !== true && freshProducePattern.test(name) && !processedProducePattern.test(name) && per100 > 200)
      issues.push({ code: "implausible_fresh_produce", item: name, message: `הערך הקלורי של ${name || "הפריט"} אינו מתאים לפרי או ירק טרי. נדרש חישוב מחדש ממקור תזונתי מתאים.` });
    if (item.explicitCalories !== true && per100 > 0 && itemMacroKcal > 0 && Math.abs(per100 - itemMacroKcal) / Math.max(per100, itemMacroKcal) > .45)
      issues.push({ code: "item_macro_calorie_mismatch", item: name, message: `הקלוריות של ${name || "הפריט"} אינן תואמות למאקרו שלו. יש לבדוק את מקור הערכים.` });
    if (Number(item.quantity) > 20 && !/יחיד|חתיכ|ביס|סוכר|כדור/i.test(String(item.unit || "")))
      issues.push({ code: "implausible_quantity", item: name, message: `הכמות של ${name || "הפריט"} גבוהה מהרגיל. בדוק שלא הוכפלה בטעות.` });
    if (item.explicitCalories !== true && Number(item.kcalPerUnit) > 0 && per100 > 0 && grams > 0) {
      const perUnit = Number(item.kcalPerUnit) * Math.max(.1, Number(item.quantity) || 1);
      const fromWeight = grams * per100 / 100;
      if (Math.abs(perUnit - fromWeight) / Math.max(perUnit, fromWeight) > .4)
        issues.push({ code: "calorie_basis_conflict", item: name, message: `יש סתירה בין הקלוריות ליחידה לבין הערך ל־100 גרם עבור ${name || "הפריט"}. יש לבחור בסיס חישוב אחד.` });
    }
  }
  const normalizedNames = items.map((item) => String(item.name || "").trim().toLocaleLowerCase()).filter(Boolean);
  if (new Set(normalizedNames).size < normalizedNames.length) issues.push({ code: "duplicate_items", message: "אותו רכיב מופיע יותר מפעם אחת בארוחה. בדוק שלא נוצרה כפילות." });
  return { valid: issues.length === 0, issues };
}

export function nutritionConfidence(product = {}) {
  const source = String(product.source || "");
  const hasMacros = Number(product.kcal) > 0 && [product.protein, product.carbs, product.fat].every((value) => Number.isFinite(Number(value)));
  if (source.includes("משרד הבריאות") && hasMacros) return { level: "high", score: 95, label: "מקור ממשלתי מאומת" };
  if (source.includes("Open Food Facts") && hasMacros && product.barcode) return { level: "medium", score: 78, label: "מוצר מזוהה בברקוד; מומלץ להשוות לתווית" };
  if (hasMacros) return { level: "medium", score: 70, label: "ערכים מלאים ממקור חיצוני" };
  return { level: "low", score: 35, label: "מידע חלקי; נדרש אישור" };
}
