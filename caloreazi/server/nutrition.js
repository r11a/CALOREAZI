const activityFactors = { low: 1.2, light: 1.375, active: 1.55, very: 1.725 };

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
