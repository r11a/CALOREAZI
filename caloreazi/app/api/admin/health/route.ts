import { requireAdmin } from "@/server/auth.js";
import { databaseHealth } from "@/server/state-database.js";
import { readState } from "@/server/store.js";
/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const state = await readState(); const denied = requireAdmin(state, request); if (denied) return denied;
  const database = await databaseHealth();
  const meals = Object.values(state.userData).reduce((count: number, data: any) => count + Number(data.today?.meals?.length || 0) + (data.history || []).reduce((sum: number, day: any) => sum + Number(day.meals?.length || 0), 0), 0);
  const month = new Date().toISOString().slice(0, 7); const usage = state.aiUsage.filter((item) => item.month === month);
  const byFeature = usage.reduce((result, item) => { const key = item.feature || "other"; result[key] = (result[key] || 0) + Number(item.cost || 0); return result; }, {});
  return Response.json({ version: process.env.CALOREAZI_VERSION || "1.13.5", build: process.env.CALOREAZI_BUILD_COMMIT || "development", application: "ok", database, storage: "ok", ai: state.ai.encryptedKey ? "configured" : "attention", users: state.users.length, activeUsers: state.users.filter((user) => !user.disabled).length, activeSessions: (state.sessions || []).filter((item) => !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now()).length, analysisJobs: { pending: (state.analysisJobs || []).filter((item) => ["pending", "processing"].includes(item.status)).length, failed: (state.analysisJobs || []).filter((item) => item.status === "failed").length }, meals, trashItems: state.trash.length, auditEvents: state.auditLog.length, aiRequests: usage.length, estimatedAiCost: usage.reduce((sum, item) => sum + Number(item.cost || 0), 0), byFeature });
}
