import { requireAdmin } from "@/server/auth.js";
import { readState } from "@/server/store.js";
export const runtime = "nodejs";
type OperationalMeal = { id: string; name: string; time: string; media?: { pendingDestination?: unknown; pendingSince?: string } };
type OperationalUserData = { history?: { meals?: OperationalMeal[] }[]; today?: { meals?: OperationalMeal[] } };

export async function GET(request: Request) {
  const state = await readState(); const denied = requireAdmin(state, request); if (denied) return denied;
  const users = new Map(state.users.map((user) => [user.id, user.name]));
  const audit = state.auditLog.slice(-200).reverse().map((item) => ({ ...item, actor: users.get(item.userId) || "System", category: item.action?.split(".")[0] || "system", severity: item.result === "success" ? "info" : "error", message: item.details || item.action }));
  const failedJobs = (state.analysisJobs || []).filter((job) => job.status === "failed").slice(-50).reverse().map((job) => ({ id: `analysis-${job.id}`, at: job.updatedAt || job.createdAt, actor: users.get(job.userId) || "System", action: "analysis.failed", target: job.kind || "meal_photo", category: "ai", severity: "error", result: "failed", message: job.errorMessage || "ניתוח AI נכשל" }));
  const pendingMedia = (Object.values(state.userData || {}) as OperationalUserData[]).flatMap((data) => [...(data.history || []), data.today].flatMap((day) => day?.meals || [])).filter((meal) => meal.media?.pendingDestination).map((meal) => ({ id: `media-${meal.id}`, at: meal.media?.pendingSince || meal.time, actor: "System", action: "storage.media_pending", target: meal.name, category: "storage", severity: "warning", result: "attention", message: "התמונה ממתינה לסנכרון ליעד האחסון שנבחר" }));
  const items = [...failedJobs, ...pendingMedia, ...audit].sort((a, b) => String(b.at || "").localeCompare(String(a.at || ""))).slice(0, 250);
  return Response.json({ items, summary: { errors: items.filter((item) => item.severity === "error").length, warnings: items.filter((item) => item.severity === "warning").length, total: items.length } });
}
