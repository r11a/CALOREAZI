export const defaultNotificationPreferences = {
  enabled: true,
  morningBrief: true,
  mealReminders: true,
  waterReminders: true,
  dailySummary: true,
  insights: true,
  coachTips: true,
  weeklyTrends: true,
  weightReminder: true,
  achievements: false,
  breakfastTime: "09:00",
  lunchTime: "14:00",
  dinnerTime: "20:00",
  waterTime: "16:30",
  summaryTime: "21:15",
  coachTime: "11:30",
  weeklyTime: "10:00",
  quietStart: "22:30",
  quietEnd: "07:00",
  maxPerDay: 5,
};

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export function normalizeNotificationPreferences(value = {}) {
  const result = { ...defaultNotificationPreferences };
  for (const key of ["enabled", "morningBrief", "mealReminders", "waterReminders", "dailySummary", "insights", "coachTips", "weeklyTrends", "weightReminder", "achievements"]) result[key] = value[key] == null ? result[key] : Boolean(value[key]);
  for (const key of ["breakfastTime", "lunchTime", "dinnerTime", "waterTime", "summaryTime", "coachTime", "weeklyTime", "quietStart", "quietEnd"]) if (timePattern.test(String(value[key] || ""))) result[key] = String(value[key]);
  result.maxPerDay = [5, 10, 15, 20].includes(Number(value.maxPerDay)) ? Number(value.maxPerDay) : 5;
  return result;
}
