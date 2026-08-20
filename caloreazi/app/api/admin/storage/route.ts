import { currentSession, requireAdmin } from "@/server/auth.js";
import { DEFAULT_STORAGE, probeStorage, storageCapacity, storageSettings } from "@/server/storage.js";
import { addAudit, readState, updateState } from "@/server/store.js";
/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";

function settingsView(state: any) { return { ...storageSettings(state), automaticBackup: state.systemSettings?.automaticBackup !== false, backupHour: Number(state.systemSettings?.backupHour ?? 3), backupRetention: Number(state.systemSettings?.backupRetention || 14) }; }

export async function GET(request: Request) {
  const state = await readState(); const denied = requireAdmin(state, request); if (denied) return denied;
  const settings = settingsView(state); const results = await Promise.allSettled([probeStorage(state, "backup"), probeStorage(state, "gallery")]);
  const capacity = await Promise.all(results.map((result) => result.status === "fulfilled" ? storageCapacity(result.value).catch(() => null) : null));
  return Response.json({ settings, status: { backup: results[0].status === "fulfilled" ? { ok: true, path: results[0].value.resolved, capacity: capacity[0] } : { ok: false, error: results[0].reason?.message }, gallery: results[1].status === "fulfilled" ? { ok: true, path: results[1].value.resolved, capacity: capacity[1] } : { ok: false, error: results[1].reason?.message } }, destinations: ["internal", "share", "media"] });
}

export async function PATCH(request: Request) {
  const current = await readState(); const denied = requireAdmin(current, request); if (denied) return denied; const body = await request.json();
  const settings = { backupDestination: ["internal", "share"].includes(body.backupDestination) ? body.backupDestination : "internal", backupRelativePath: String(body.backupRelativePath || DEFAULT_STORAGE.backupRelativePath), galleryDestination: ["internal", "share", "media"].includes(body.galleryDestination) ? body.galleryDestination : "internal", galleryRelativePath: String(body.galleryRelativePath || DEFAULT_STORAGE.galleryRelativePath) };
  await probeStorage(current, "backup", settings); await probeStorage(current, "gallery", settings);
  const state = await updateState((latest) => { latest.systemSettings.storage = settings; latest.systemSettings.automaticBackup = body.automaticBackup !== false; latest.systemSettings.backupHour = Math.min(23, Math.max(0, Number(body.backupHour) || 0)); latest.systemSettings.backupRetention = Math.min(60, Math.max(2, Number(body.backupRetention) || 14)); addAudit(latest, { userId: currentSession(request)?.userId, action: "storage.updated", target: `${settings.backupDestination}/${settings.galleryDestination}` }); return latest; });
  return Response.json({ settings: settingsView(state), ok: true });
}
