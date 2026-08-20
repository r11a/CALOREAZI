import { requireUser } from "@/server/auth.js";
import { ensureUserData, readState } from "@/server/store.js";
export const runtime = "nodejs";
export async function GET(request: Request) { const state = await readState(); const session = requireUser(state, request); if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 }); const data = ensureUserData(state, session.userId); return Response.json({ days: [...data.history, data.today].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90), measurements: data.measurements.slice(-90), activity: data.activity.slice(-90) }); }
