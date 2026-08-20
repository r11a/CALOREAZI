import { requireUser } from "@/server/auth.js";
import { ensureUserData, readState, updateState, userView } from "@/server/store.js";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const initial = await readState(); const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json(); const weight = Number(body.weight);
  if (!(weight >= 25 && weight <= 350)) return Response.json({ error: "יש להזין משקל תקין" }, { status: 400 });
  const date = String(body.date || new Date().toISOString().slice(0, 10));
  const state = await updateState((latest) => { const data = ensureUserData(latest, session.userId); data.measurements = data.measurements.filter((item) => item.date !== date); data.measurements.push({ id: crypto.randomUUID(), date, weight, at: new Date().toISOString() }); data.measurements.sort((a, b) => a.date.localeCompare(b.date)); data.profile.weight = weight; return latest; });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
