import { requireUser } from "@/server/auth.js";
import { ensurePushConfiguration, sendPush } from "@/server/push.js";
import { addAudit, readState, updateState } from "@/server/store.js";
import { requireSameOrigin } from "@/server/security.js";
export const runtime = "nodejs";

function validSubscription(value: any) {
  try { const url = new URL(String(value?.endpoint || "")); return url.protocol === "https:" && Boolean(value?.keys?.p256dh && value?.keys?.auth); }
  catch { return false; }
}

export async function GET(request: Request) {
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const configuration = await ensurePushConfiguration();
  const subscriptions = configuration.subscriptions || [];
  return Response.json({ publicKey: configuration.publicKey, subscribed: subscriptions.some((item) => item.userId === session.userId) });
}

export async function POST(request: Request) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied;
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  const body = await request.json();
  if (!validSubscription(body.subscription)) return Response.json({ error: "מנוי ההתראות אינו תקין" }, { status: 400 });
  const endpoint = String(body.subscription.endpoint);
  await ensurePushConfiguration();
  const next = await updateState((latest) => {
    const configuration = latest.systemSettings.webPush;
    const subscriptions = (configuration.subscriptions || []).filter((item) => item.endpoint !== endpoint);
    subscriptions.push({ userId: session.userId, endpoint, keys: body.subscription.keys, userAgent: String(request.headers.get("user-agent") || "").slice(0, 240), createdAt: new Date().toISOString() });
    configuration.subscriptions = subscriptions.filter((item) => item.userId !== session.userId).concat(subscriptions.filter((item) => item.userId === session.userId).slice(-5));
    addAudit(latest, { userId: session.userId, action: "notifications.subscribed", target: "device" });
    return latest;
  });
  const subscription = next.systemSettings.webPush.subscriptions.find((item) => item.endpoint === endpoint);
  try {
    await sendPush(subscription, { title: "CALOREAZI", body: "ההתראות פעילות גם כשהאפליקציה סגורה והמכשיר נעול.", url: "./", tag: "push-ready" });
  } catch (error: any) {
    const status = Number(error?.statusCode || 0);
    if ([404, 410].includes(status)) await updateState((latest) => { latest.systemSettings.webPush.subscriptions = (latest.systemSettings.webPush.subscriptions || []).filter((item) => item.endpoint !== endpoint); return latest; });
    return Response.json({ error: "המנוי נשמר אך התראת הבדיקה לא נמסרה. בדוק הרשאות והתנסה שוב." }, { status: 502 });
  }
  return Response.json({ ok: true, subscribed: true });
}

export async function DELETE(request: Request) {
  const originDenied = requireSameOrigin(request); if (originDenied) return originDenied;
  const state = await readState(); const session = requireUser(state, request);
  if (!session) return Response.json({ error: "יש להתחבר" }, { status: 401 });
  await updateState((latest) => { const configuration = latest.systemSettings?.webPush; if (configuration) configuration.subscriptions = (configuration.subscriptions || []).filter((item) => item.userId !== session.userId); addAudit(latest, { userId: session.userId, action: "notifications.unsubscribed", target: "device" }); return latest; });
  return Response.json({ ok: true, subscribed: false });
}
