const activityFactors = { low: 1.2, light: 1.375, active: 1.55, very: 1.725 };

export function calculateMealFromItems(items = []) {
  const totals = items.slice(0, 30).reduce((result, item) => {
    const factor = Math.max(0, Number(item.grams) || 0) * Math.max(0.1, Number(item.quantity) || 1) / 100;
    result.kcal += Math.max(0, Number(item.kcalPer100) || 0) * factor;
    result.protein += Math.max(0, Number(item.proteinPer100) || 0) * factor;
    result.carbs += Math.max(0, Number(item.carbsPer100) || 0) * factor;
    result.fat += Math.max(0, Number(item.fatPer100) || 0) * factor;
    if (item.sugarPer100 != null) { result.sugar += Math.max(0, Number(item.sugarPer100) || 0) * factor; result.sugarTrackedItems += 1; }
    return result;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sugarTrackedItems: 0 });
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
  const totals = meals.reduce((sum, meal) => ({ kcal: sum.kcal + Number(meal.kcal || 0), protein: sum.protein + Number(meal.protein || 0) }), { kcal: 0, protein: 0 });
  const calorieTarget = Math.max(1, Number(profile?.calories || 2000));
  const proteinTarget = Math.max(1, Number(profile?.protein || 100));
  const waterTarget = Math.max(1, Number(profile?.waterMl || 2000));
  const calorieRatio = totals.kcal / calorieTarget;
  const calorieScore = Math.max(0, 40 - Math.abs(1 - calorieRatio) * 55);
  const proteinScore = Math.min(25, totals.protein / proteinTarget * 25);
  const waterScore = Math.min(20, Number(day?.waterMl || 0) / waterTarget * 20);
  const dayActivity = activity.filter((item) => item.date === day?.date);
  const activeMinutes = dayActivity.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const activityScore = Math.min(10, activeMinutes / 30 * 10);
  const consistencyScore = meals.length >= 2 ? 5 : meals.length ? 3 : 0;
  const score = Math.round(calorieScore + proteinScore + waterScore + activityScore + consistencyScore);
  return { score: Math.max(0, Math.min(100, score)), totals, parts: { calories: Math.round(calorieScore), protein: Math.round(proteinScore), water: Math.round(waterScore), activity: Math.round(activityScore), consistency: consistencyScore } };
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
