import { processNextMealAnalysis } from "../server/meal-analysis.js";

while (true) {
  try { const worked = await processNextMealAnalysis(); if (!worked) await new Promise((resolve) => setTimeout(resolve, 1000)); }
  catch (error) { console.error("analysis worker error", error instanceof Error ? error.message : error); await new Promise((resolve) => setTimeout(resolve, 2000)); }
}
