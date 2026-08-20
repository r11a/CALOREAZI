import { requireUser } from "@/server/auth.js";
import { readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const initial = await readState();
  const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const { amount = 250 } = await request.json();
  const state = await updateState((latest) => { const today = latest.userData[session.userId].today; today.waterMl = Math.max(0, Number(today.waterMl || 0) + Number(amount || 0)); return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
