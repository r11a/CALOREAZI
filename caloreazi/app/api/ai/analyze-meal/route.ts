import { requireUser } from "@/server/auth.js";
import { createHash } from "node:crypto";
import { aiRole, findModel } from "@/server/ai/models.js";
import { evaluateBudget } from "@/server/ai/usage.js";
import { processNextMealAnalysis } from "@/server/meal-analysis.js";
import { checkRateLimit, requireSameOrigin } from "@/server/security.js";
import { readState, updateState } from "@/server/store.js";
export const runtime = "nodejs";
function publicJob(job: { input?: unknown; [key: string]: unknown }) { const safe = { ...job }; delete safe.input; return safe; }

export async function GET(request: Request) {
  const state = await readState(); const session = requireUser(state, request); if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id"); const jobs = (state.analysisJobs || []).filter((job) => job.userId === session.userId);
  if (id) { const job = jobs.find((item) => item.id === id || item.clientId === id); if (!job) return Response.json({ error: "הניתוח לא נמצא" }, { status: 404 }); return Response.json(publicJob(job)); }
  return Response.json({ jobs: jobs.slice(-20).reverse().map(publicJob) });
}

export async function POST(request: Request) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied; const state = await readState(); const session = requireUser(state, request); if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const limited = checkRateLimit(`meal-analysis:${session.userId}`, { limit: 20, windowMs: 60 * 60_000 }); if (limited) return limited;
  if (!state.ai.encryptedKey) return Response.json({ error: "מנהל המערכת טרם הגדיר שירות AI" }, { status: 409 });
  const visionRole = aiRole(state.ai, "vision"); if (!findModel(visionRole.provider, visionRole.model)?.vision) return Response.json({ error: "מודל זיהוי הארוחה שנבחר אינו תומך בתמונות" }, { status: 409 });
  const { imageDataUrl, clientId: requestedClientId, recognitionHint: requestedRecognitionHint } = await request.json(); const clientId = String(requestedClientId || request.headers.get("idempotency-key") || crypto.randomUUID()).slice(0, 120); const recognitionHint = String(requestedRecognitionHint || "").trim().slice(0, 300);
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(imageDataUrl || ""))) return Response.json({ error: "יש לצלם או לבחור תמונת JPG, PNG או WebP" }, { status: 400 });
  if (String(imageDataUrl).length > 8_000_000) return Response.json({ error: "התמונה גדולה מדי" }, { status: 413 });
  const imageFingerprint = createHash("sha256").update(`meal-photo-v2\n${String(imageDataUrl)}\n${recognitionHint}`).digest("hex");
  const cached = (state.analysisJobs || []).find((job) => job.userId === session.userId && job.imageFingerprint === imageFingerprint && ["completed", "needs_confirmation"].includes(job.status) && job.result && Date.now() - new Date(job.updatedAt || job.createdAt).getTime() < 30 * 86_400_000);
  if (cached) return Response.json({ jobId: cached.id, status: cached.status, ...cached.result, reusedAnalysis: true });
  const existing = (state.analysisJobs || []).find((job) => job.userId === session.userId && job.clientId === clientId); if (existing) { if (existing.status === "failed") { await updateState((latest) => { const retry = latest.analysisJobs.find((item) => item.id === existing.id); retry.status = "pending"; retry.imageFingerprint = imageFingerprint; retry.input = { imageDataUrl: String(imageDataUrl), recognitionHint }; retry.attemptCount = 0; retry.nextAttemptAt = null; retry.errorMessage = ""; retry.updatedAt = new Date().toISOString(); return latest; }); void processNextMealAnalysis(); return Response.json({ jobId: existing.id, status: "pending", retry: true }, { status: 202 }); } return Response.json({ jobId: existing.id, status: existing.status, ...(existing.result || {}), idempotent: true }, { status: ["completed", "needs_confirmation"].includes(existing.status) ? 200 : 202 }); }
  const month = new Date().toISOString().slice(0, 7); const spent = state.aiUsage.filter((item) => item.month === month).reduce((sum, item) => sum + Number(item.cost || 0), 0); const budget = evaluateBudget({ spentUsd: spent, monthlyBudgetUsd: state.ai.monthlyBudget, softLimitPercent: state.ai.softLimit, hardLimitEnabled: state.ai.hardLimit }); if (!budget.allowed) return Response.json({ error: "תקציב ה-AI החודשי הגיע למגבלה הקשיחה" }, { status: 429 });
  const jobId = crypto.randomUUID(); await updateState((latest) => { latest.analysisJobs = latest.analysisJobs || []; latest.analysisJobs.push({ id: jobId, clientId, imageFingerprint, userId: session.userId, kind: "meal_photo", status: "pending", provider: visionRole.provider, model: visionRole.model, attemptCount: 0, input: { imageDataUrl: String(imageDataUrl), recognitionHint }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); latest.analysisJobs = latest.analysisJobs.slice(-500); return latest; });
  void processNextMealAnalysis();
  return Response.json({ jobId, status: "pending" }, { status: 202 });
}

export async function DELETE(request: Request) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied; const state = await readState(); const session = requireUser(state, request); if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 }); const { id } = await request.json(); let cancelled = false;
  await updateState((latest) => { const job = latest.analysisJobs?.find((item) => item.id === id && item.userId === session.userId); if (job && ["pending", "processing", "failed"].includes(job.status)) { job.status = "cancelled"; delete job.input; job.updatedAt = new Date().toISOString(); cancelled = true; } return latest; });
  return cancelled ? Response.json({ ok: true }) : Response.json({ error: "לא ניתן לבטל את הניתוח" }, { status: 409 });
}
