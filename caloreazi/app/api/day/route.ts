import { requireUser } from "@/server/auth.js";
import { localDateAt, userTimeZone } from "@/server/local-date.js";
import { addAudit, ensureUserData, readState, updateState, userView } from "@/server/store.js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const initial = await readState();
  const session = requireUser(initial, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const initialData = ensureUserData(initial, session.userId);
  if (initialData.profile?.dayBoundaryMode !== "manual") return Response.json({ error: "העברת יום ידנית אינה פעילה בפרופיל" }, { status: 409 });
  const actualDate = localDateAt(new Date(), userTimeZone(initialData));
  const logicalNext = new Date(`${initialData.today.date}T12:00:00.000Z`);
  logicalNext.setUTCDate(logicalNext.getUTCDate() + 1);
  const nextDate = [actualDate, logicalNext.toISOString().slice(0, 10)].sort().at(-1)!;
  const endedAt = new Date().toISOString();
  const state = await updateState((latest) => {
    const data = ensureUserData(latest, session.userId);
    const completed = { ...structuredClone(data.today), startedAt: data.profile.activeDayStartedAt || null, endedAt, manualCompleted: true };
    const existing = data.history.find((day) => day.date === completed.date);
    if (existing) Object.assign(existing, completed);
    else data.history.push(completed);
    data.history.sort((a, b) => a.date.localeCompare(b.date));
    data.today = { date: nextDate, waterMl: 0, waterEvents: [], meals: [], startedAt: endedAt };
    data.profile.activeDayStartedAt = endedAt;
    data.profile.activeDayDate = nextDate;
    addAudit(latest, { userId: session.userId, action: "day.completed_manually", target: completed.date, details: `next=${nextDate}` });
    return latest;
  });
  return Response.json(userView(state, session.userId, session.role === "admin"));
}
