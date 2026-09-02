import { requireAdmin } from "@/server/auth.js";
import { databaseHealth } from "@/server/state-database.js";
import { readState } from "@/server/store.js";
/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const state = await readState(); const denied = requireAdmin(state, request); if (denied) return denied;
  const database = await databaseHealth();
  const allMeals = Object.values(state.userData).flatMap((data: any) => [data.today, ...(data.history || [])].flatMap((day: any) => day?.meals || [])).filter((meal: any) => !meal.beverageEntry);
  const meals = allMeals.length;
  const month = new Date().toISOString().slice(0, 7); const usage = state.aiUsage.filter((item) => item.month === month);
  const monthlyMeals = allMeals.filter((meal: any) => String(meal.time || meal.date || "").slice(0, 7) === month);
  const activeUserIds = new Set(monthlyMeals.map((meal: any) => meal.userId).filter(Boolean));
  const monthlyAiCost = usage.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const byFeature = usage.reduce((result, item) => { const key = item.feature || "other"; result[key] = (result[key] || 0) + Number(item.cost || 0); return result; }, {});
  const recognized = allMeals.filter((meal: any) => ["photo", "voice"].includes(meal.source));
  const saveAudits = (state.auditLog || []).filter((item: any) => item.action === "meal.created").slice(-500).map((item: any) => { try { return JSON.parse(item.details || "{}"); } catch { return {}; } });
  const timedSaveAudits = saveAudits.filter((item: any) => Number(item.interactionDurationMs || item.durationMs || 0) > 0);
  const quality = { averageAddSeconds: timedSaveAudits.length ? Math.round(timedSaveAudits.reduce((sum: number, item: any) => sum + Number(item.interactionDurationMs || item.durationMs), 0) / timedSaveAudits.length / 100) / 10 : null, recognitionApprovalRate: recognized.length ? Math.round(recognized.filter((meal: any) => !meal.updatedAt).length / recognized.length * 100) : null, correctionRate: recognized.length ? Math.round(recognized.filter((meal: any) => meal.updatedAt).length / recognized.length * 100) : null, highReliabilityRate: allMeals.length ? Math.round(allMeals.filter((meal: any) => Number(meal.nutritionReliability?.score || 0) >= 88).length / allMeals.length * 100) : null, duplicateBlocks: (state.auditLog || []).filter((item: any) => item.action === "meal.duplicate_blocked").length, failedAnalyses: (state.analysisJobs || []).filter((item: any) => item.status === "failed").length, aiCostPerMeal: monthlyMeals.length ? monthlyAiCost / monthlyMeals.length : 0, aiCostPerActiveUser: activeUserIds.size ? monthlyAiCost / activeUserIds.size : 0 };
  const releaseVersion = "1.23.2";
  return Response.json({ version: process.env.CALOREAZI_VERSION || releaseVersion, build: process.env.CALOREAZI_BUILD_COMMIT || "development", application: "ok", database, storage: "ok", ai: state.ai.encryptedKey ? "configured" : "attention", users: state.users.length, activeUsers: state.users.filter((user) => !user.disabled).length, activeSessions: (state.sessions || []).filter((item) => !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now()).length, analysisJobs: { pending: (state.analysisJobs || []).filter((item) => ["pending", "processing"].includes(item.status)).length, failed: quality.failedAnalyses }, meals, quality, trashItems: state.trash.length, auditEvents: state.auditLog.length, aiRequests: usage.length, estimatedAiCost: usage.reduce((sum, item) => sum + Number(item.cost || 0), 0), byFeature });
}
