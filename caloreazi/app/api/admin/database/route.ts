import { currentSession, requireAdmin } from "@/server/auth.js";
import { databaseDiagnostics, maintainDatabase } from "@/server/state-database.js";
import { addAudit, readState, updateState } from "@/server/store.js";
import { requireSameOrigin } from "@/server/security.js";
export const runtime = "nodejs";

export async function GET(request: Request) { const state = await readState(); const denied = requireAdmin(state, request); if (denied) return denied; return Response.json(await databaseDiagnostics()); }
export async function POST(request: Request) { const originDenied = requireSameOrigin(request); if (originDenied) return originDenied; const state = await readState(); const denied = requireAdmin(state, request); if (denied) return denied; const { action } = await request.json(); try { const result = await maintainDatabase(action); await updateState((latest) => { addAudit(latest, { userId: currentSession(request)?.userId, action: `database.${action}`, target: "postgresql" }); return latest; }); return Response.json(result); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Database maintenance failed" }, { status: 400 }); } }
