import { requireAdmin } from "@/server/auth.js";
import { readState } from "@/server/store.js";
export const runtime = "nodejs";
export async function GET(request: Request) { const state = await readState(); const denied = requireAdmin(state, request); if (denied) return denied; const users = new Map(state.users.map((user) => [user.id, user.name])); return Response.json({ items: state.auditLog.slice(-200).reverse().map((item) => ({ ...item, actor: users.get(item.userId) || "System" })) }); }
