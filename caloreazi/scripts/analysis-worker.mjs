import { processNextMealAnalysis } from "../server/meal-analysis.js";
import { processDueNotifications } from "../server/notification-scheduler.js";

let nextNotificationCheck = 0;
while (true) {
  try { const worked = await processNextMealAnalysis(); if (Date.now() >= nextNotificationCheck) { nextNotificationCheck = Date.now() + 60_000; await processDueNotifications(); } if (!worked) await new Promise((resolve) => setTimeout(resolve, 1000)); }
  catch (error) { console.error("analysis worker error", error instanceof Error ? error.message : error); await new Promise((resolve) => setTimeout(resolve, 2000)); }
}
