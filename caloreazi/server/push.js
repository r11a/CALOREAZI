import webpush from "web-push";
import { decryptSecret, encryptSecret, readState, updateState } from "./store.js";

const SUBJECT = process.env.CALOREAZI_VAPID_SUBJECT || "mailto:notifications@caloreazi.app";

export async function ensurePushConfiguration() {
  let state = await readState();
  if (state.systemSettings?.webPush?.publicKey && state.systemSettings?.webPush?.encryptedPrivateKey) return state.systemSettings.webPush;
  const keys = webpush.generateVAPIDKeys();
  state = await updateState(async (latest) => {
    latest.systemSettings = latest.systemSettings || {};
    if (!latest.systemSettings.webPush?.publicKey) latest.systemSettings.webPush = {
      publicKey: keys.publicKey,
      encryptedPrivateKey: await encryptSecret(keys.privateKey),
      subscriptions: [],
      createdAt: new Date().toISOString(),
    };
    return latest;
  });
  return state.systemSettings.webPush;
}

export async function sendPush(subscription, payload) {
  const configuration = await ensurePushConfiguration();
  webpush.setVapidDetails(SUBJECT, configuration.publicKey, await decryptSecret(configuration.encryptedPrivateKey));
  return webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 300, urgency: "normal" });
}
