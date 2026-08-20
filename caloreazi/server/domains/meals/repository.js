import { ensureUserData } from "../../store.js";
import { localDateAt, userTimeZone } from "../../local-date.js";

export function mealDays(state, userId) { const data = ensureUserData(state, userId); return [...data.history, data.today]; }
export function ownedMeals(state, userId) { return mealDays(state, userId).flatMap((day) => (day.meals || []).map((meal) => ({ meal, day }))); }
export function findOwnedMeal(state, userId, mealId) { return ownedMeals(state, userId).find(({ meal }) => meal.id === mealId) || null; }
export function removeOwnedMeal(state, userId, mealId) { const found = findOwnedMeal(state, userId, mealId); if (!found) return null; found.day.meals = found.day.meals.filter((meal) => meal.id !== mealId); return found.meal; }
export function restoreOwnedMeal(state, userId, meal) { const data = ensureUserData(state, userId); const date = localDateAt(meal.time, userTimeZone(data)); const day = data.today.date === date ? data.today : (data.history.find((item) => item.date === date) || (() => { const created = { date, waterMl: 0, meals: [] }; data.history.push(created); return created; })()); day.meals.push(meal); day.meals.sort((a, b) => String(a.time).localeCompare(String(b.time))); return meal; }
