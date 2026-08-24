const activityFactors = { low: 1.2, light: 1.375, active: 1.55, very: 1.725 };

export function ageFromBirthDate(value, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const birth = new Date(`${value}T12:00:00Z`); if (!Number.isFinite(birth.getTime()) || birth > now) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear(); const beforeBirthday = now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate()); if (beforeBirthday) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

export function roundCalories(value) {
  return Math.round(Math.max(0, Number(value) || 0));
}

export function calculateMealFromItems(items = []) {
  const totals = items.slice(0, 30).reduce((result, item) => {
    const factor = Math.max(0, Number(item.grams) || 0) * Math.max(0.1, Number(item.quantity) || 1) / 100;
    result.kcal += Math.max(0, Number(item.kcalPer100) || 0) * factor;
    result.protein += Math.max(0, Number(item.proteinPer100) || 0) * factor;
    result.carbs += Math.max(0, Number(item.carbsPer100) || 0) * factor;
    result.fat += Math.max(0, Number(item.fatPer100) || 0) * factor;
    if (item.sugarPer100 != null) { result.sugar += Math.max(0, Number(item.sugarPer100) || 0) * factor; result.sugarTrackedItems += 1; }
    for (const [field, totalField] of [["fiberPer100","fiber"],["sodiumMgPer100","sodiumMg"],["saturatedFatPer100","saturatedFat"],["addedSugarPer100","addedSugar"]]) if (item[field] != null) { result[totalField] += Math.max(0, Number(item[field]) || 0) * factor; result[`${totalField}TrackedItems`] += 1; }
    return result;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sugarTrackedItems: 0, fiber: 0, fiberTrackedItems: 0, sodiumMg: 0, sodiumMgTrackedItems: 0, saturatedFat: 0, saturatedFatTrackedItems: 0, addedSugar: 0, addedSugarTrackedItems: 0 });
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Math.round(value)]));
}

export function calculateNutritionTargets(input) {
  const weight = Number(input.weight);
  const height = Number(input.height);
  const age = Number(input.age);
  const sex = input.sex === "female" ? "female" : "male";
  const heightMeters = height / 100;
  const bmi = weight / (heightMeters * heightMeters);
  const bmiCategory = bmi < 18.5 ? "underweight" : bmi < 25 ? "healthy" : bmi < 30 ? "overweight" : "obesity";
  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === "female" ? -161 : 5);
  const activityFactor = activityFactors[input.activity] || activityFactors.light;
  const maintenanceCalories = bmr * activityFactor;
  const goalAdjustment = input.goal === "lose" && bmi >= 18.5
    ? -Math.min(500, Math.max(250, maintenanceCalories * 0.15))
    : input.goal === "gain" ? 250 : 0;
  const safetyFloor = Math.max(sex === "female" ? 1200 : 1500, bmr * 0.9);
  const rawTarget = maintenanceCalories + goalAdjustment;
  const calories = Math.round(Math.max(safetyFloor, rawTarget) / 50) * 50;

  return {
    calories,
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory,
    healthyWeightMin: Math.round(18.5 * heightMeters * heightMeters * 10) / 10,
    healthyWeightMax: Math.round(24.9 * heightMeters * heightMeters * 10) / 10,
    bmr: Math.round(bmr),
    maintenanceCalories: Math.round(maintenanceCalories),
    activityFactor,
    goalAdjustment: calories - Math.round(maintenanceCalories / 50) * 50,
    safetyFloor: Math.round(safetyFloor),
    safetyFloorApplied: rawTarget < safetyFloor,
    expectedWeeklyChangeKg: Math.round(Math.abs(calories - maintenanceCalories) * 7 / 7700 * 10) / 10,
    goalAdjustedForBmi: input.goal === "lose" && bmi < 18.5,
    formula: "Mifflin–St Jeor",
  };
}

export function calculateDayScore(day, profile, activity = []) {
  const meals = Array.isArray(day?.meals) ? day.meals : [];
  const totals = meals.reduce((sum, meal) => ({
    kcal: sum.kcal + Number(meal.kcal || 0),
    protein: sum.protein + Number(meal.protein || 0),
    carbs: sum.carbs + Number(meal.carbs || 0),
    fat: sum.fat + Number(meal.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const items = meals.flatMap((meal) => meal.items || []); const itemCount = items.length; const micronutrients = calculateMealFromItems(items);
  for (const field of ["fiber","sodiumMg","saturatedFat","addedSugar"]) { totals[field] = Number(micronutrients[field] || 0); totals[`${field}TrackedItems`] = Number(micronutrients[`${field}TrackedItems`] || 0); }
  const produceIds = new Set(["tomato","cucumber","lettuce","avocado","apple","banana","orange","mango","plum","melon","grapefruit","watermelon","kiwi","peach","potato-boiled","sweet-potato-cooked"]);
  const produceGrams = items.reduce((sum, item) => sum + (item.foodGroup === "produce" || produceIds.has(item.nutritionSource?.sourceId) ? Math.max(0, Number(item.grams) || 0) * Math.max(.1, Number(item.quantity) || 1) : 0), 0);
  const uniqueFoods = new Set(items.map((item) => String(item.confirmedName || item.name || "").trim().toLocaleLowerCase()).filter(Boolean)).size;
  const calorieTarget = Math.max(1, Number(profile?.calories || 2000)); const proteinTarget = Math.max(1, Number(profile?.protein || 100)); const carbsTarget = Math.max(1, Number(profile?.carbs || calorieTarget * .45 / 4)); const fatTarget = Math.max(1, Number(profile?.fat || calorieTarget * .3 / 9)); const waterTarget = Math.max(1, Number(profile?.waterMl || 2000));
  const ratioScore = (actual, target, max, low = .9, high = 1.1) => { const ratio = actual / target; if (ratio >= low && ratio <= high) return max; const distance = ratio < low ? (low - ratio) / low : (ratio - high) / high; return Math.max(0, max * (1 - distance * 1.7)); };
  const adequacy = (actual, target, max) => Math.min(max, Math.max(0, actual / target * max));
  const moderation = (actual, limit, max) => actual <= limit ? max : Math.max(0, max * (1 - (actual - limit) / Math.max(1, limit)));
  const tracked = (field) => itemCount > 0 && Number(totals[`${field}TrackedItems`] || 0) / itemCount >= .7;
  const end = new Date(`${day?.date || new Date().toISOString().slice(0,10)}T23:59:59`); const start = new Date(end); start.setDate(start.getDate() - 6); const weeklyMinutes = activity.filter((item) => { const date = new Date(`${item.date || ""}T12:00:00`); return Number.isFinite(date.getTime()) && date >= start && date <= end; }).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const parameters = [
    { key: "produce", group: "quality", label: "ירקות ופירות", value: produceGrams, target: 400, unit: "גרם", max: 10, score: adequacy(produceGrams, 400, 10), available: itemCount > 0, tip: "להוסיף ירק או פרי למנה הבאה." },
    { key: "fiber", group: "quality", label: "סיבים", value: totals.fiber, target: 25, unit: "גרם", max: 10, score: adequacy(totals.fiber, 25, 10), available: tracked("fiber"), tip: "להעדיף ירקות, קטניות ודגנים מלאים." },
    { key: "saturatedFat", group: "quality", label: "שומן רווי", value: totals.saturatedFat, target: calorieTarget * .1 / 9, unit: "גרם עד", max: 7, score: moderation(totals.saturatedFat, calorieTarget * .1 / 9, 7), available: tracked("saturatedFat"), tip: "להפחית מזונות עשירים בשומן רווי." },
    { key: "addedSugar", group: "quality", label: "סוכר מוסף", value: totals.addedSugar, target: calorieTarget * .1 / 4, unit: "גרם עד", max: 7, score: moderation(totals.addedSugar, calorieTarget * .1 / 4, 7), available: tracked("addedSugar"), tip: "לצמצם משקאות ומזונות עם סוכר מוסף." },
    { key: "sodium", group: "quality", label: "נתרן", value: totals.sodiumMg, target: 2000, unit: "מ״ג עד", max: 6, score: moderation(totals.sodiumMg, 2000, 6), available: tracked("sodiumMg"), tip: "להעדיף פחות מלח ומזון מעובד." },
    { key: "calories", group: "targets", label: "קלוריות", value: totals.kcal, target: calorieTarget, unit: "קק״ל", max: 15, score: ratioScore(totals.kcal, calorieTarget, 15), available: meals.length > 0, tip: "להתקרב בהדרגה לטווח הקלורי שלך." },
    { key: "protein", group: "targets", label: "חלבון", value: totals.protein, target: proteinTarget, unit: "גרם", max: 8, score: adequacy(totals.protein, proteinTarget, 8), available: meals.length > 0, tip: "להוסיף מקור חלבון איכותי." },
    { key: "carbs", group: "targets", label: "פחמימות", value: totals.carbs, target: carbsTarget, unit: "גרם", max: 4, score: ratioScore(totals.carbs, carbsTarget, 4, .8, 1.2), available: meals.length > 0, tip: "לאזן את כמות הפחמימות מול היעד." },
    { key: "fat", group: "targets", label: "שומן", value: totals.fat, target: fatTarget, unit: "גרם", max: 3, score: ratioScore(totals.fat, fatTarget, 3, .8, 1.2), available: meals.length > 0, tip: "לאזן את כמות השומן מול היעד." },
    { key: "water", group: "habits", label: "שתייה", value: Number(day?.waterMl || 0), target: waterTarget, unit: "מ״ל", max: 5, score: adequacy(Number(day?.waterMl || 0), waterTarget, 5), available: true, tip: "להשלים את השתייה בהדרגה." },
    { key: "activity", group: "habits", label: "פעילות שבועית", value: weeklyMinutes, target: 150, unit: "דקות", max: 7, score: adequacy(weeklyMinutes, 150, 7), available: true, tip: "להוסיף פעילות שמתאימה לך במהלך השבוע." },
    { key: "variety", group: "habits", label: "גיוון", value: uniqueFoods, target: 8, unit: "מזונות", max: 5, score: adequacy(uniqueFoods, 8, 5), available: itemCount > 0, tip: "לגוון בין מקורות מזון שונים." },
    { key: "logging", group: "habits", label: "כיסוי היום", value: meals.length, target: 3, unit: "ארוחות", max: 3, score: adequacy(meals.length, 3, 3), available: true, tip: "להשלים תיעוד כדי לקבל תמונה מדויקת." },
  ].map((item) => ({ ...item, score: Math.round(item.score * 10) / 10, percent: Math.round(item.score / item.max * 100) }));
  const groupMax = { quality: 50, targets: 30, habits: 20 }; const components = {};
  for (const group of Object.keys(groupMax)) { const available = parameters.filter((item) => item.group === group && item.available); const rawMax = available.reduce((sum, item) => sum + item.max, 0); const value = rawMax ? available.reduce((sum, item) => sum + item.score, 0) / rawMax * groupMax[group] : 0; components[group] = { score: Math.round(value), max: groupMax[group], coverage: Math.round(rawMax / parameters.filter((item) => item.group === group).reduce((sum, item) => sum + item.max, 0) * 100) }; }
  const coverage = Math.round(parameters.filter((item) => item.available).reduce((sum, item) => sum + item.max, 0) / parameters.reduce((sum, item) => sum + item.max, 0) * 100); const score = Math.round(Object.values(components).reduce((sum, item) => sum + item.score, 0)); const improvement = parameters.filter((item) => item.available).sort((a, b) => a.percent - b.percent)[0];
  return { version: "2.0", score: Math.max(0, Math.min(100, score)), coverage, status: coverage < 40 ? "insufficient" : day?.date === new Date().toISOString().slice(0,10) ? "provisional" : "complete", totals, components, parameters, recommendation: improvement?.tip || "הוסף נתונים כדי לקבל המלצה מדויקת.", parts: { calories: Math.round(parameters.find((item) => item.key === "calories")?.score || 0), protein: Math.round(parameters.find((item) => item.key === "protein")?.score || 0), water: Math.round(parameters.find((item) => item.key === "water")?.score || 0), activity: Math.round(parameters.find((item) => item.key === "activity")?.score || 0), consistency: Math.round(parameters.find((item) => item.key === "logging")?.score || 0) } };
}

export function calculateMealScore(meal) {
  const kcal = Math.max(1, Number(meal?.kcal || 0));
  const proteinCalories = Number(meal?.protein || 0) * 4;
  const proteinRatio = proteinCalories / kcal;
  const protein = Math.min(35, proteinRatio / .25 * 35);
  const energy = kcal >= 200 && kcal <= 800 ? 30 : kcal < 1100 ? 20 : 10;
  const composition = Array.isArray(meal?.items) ? Math.min(25, meal.items.length * 6) : 10;
  const confidence = Math.round(Math.max(0, Math.min(10, Number(meal?.confidence || .7) * 10)));
  return Math.round(Math.min(100, protein + energy + composition + confidence));
}
