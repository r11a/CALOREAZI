import { readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { currentSession, requireAdmin } from "@/server/auth.js";
import { probeStorage } from "@/server/storage.js";
import { addAudit, readState, updateState, writeState } from "@/server/store.js";
export const runtime = "nodejs";

async function backupDir(state: unknown) { return (await probeStorage(state, "backup")).resolved; }
async function listBackups(state: unknown) { const dir = await backupDir(state); const files = (await readdir(dir)).filter((name) => /^caloreazi-.*\.json\.gz$/.test(name)); return Promise.all(files.map(async (name) => { const info = await stat(path.join(dir, name)); return { name, size: info.size, createdAt: info.mtime.toISOString(), type: "Database + configuration", verified: info.size > 0 }; })); }

export async function GET(request: Request) { const state = await readState(); const denied = requireAdmin(state, request); if (denied) return denied; const url = new URL(request.url); const requested = url.searchParams.get("download"); if (requested) { const safe = path.basename(requested); if (safe !== requested || !/^caloreazi-.*\.json\.gz$/.test(safe)) return Response.json({ error: "שם גיבוי לא תקין" }, { status: 400 }); try { const data = await readFile(path.join(await backupDir(state), safe)); return new Response(data, { headers: { "Content-Type": "application/gzip", "Content-Disposition": `attachment; filename="${safe}"` } }); } catch { return Response.json({ error: "הגיבוי לא נמצא" }, { status: 404 }); } } return Response.json({ backups: (await listBackups(state)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), retention: state.systemSettings.backupRetention }); }
export async function POST(request: Request) { const state = await readState(); const denied = requireAdmin(state, request); if (denied) return denied; const dir = await backupDir(state); const name = `caloreazi-${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`; await writeFile(path.join(dir, name), gzipSync(JSON.stringify(state, null, 2)), { mode: 0o600 }); await updateState((latest) => { addAudit(latest, { userId: currentSession(request)?.userId || null, action: "backup.created", target: name }); return latest; }); const backups = (await listBackups(state)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); for (const item of backups.slice(Number(state.systemSettings.backupRetention || 14))) await unlink(path.join(dir, item.name)); return Response.json({ ok: true, backup: backups[0], backups: backups.slice(0, Number(state.systemSettings.backupRetention || 14)) }); }

export async function PATCH(request: Request) {
  const current = await readState(); const denied = requireAdmin(current, request); if (denied) return denied;
  const { name } = await request.json(); const safe = path.basename(String(name || ""));
  if (safe !== name || !/^caloreazi-.*\.json\.gz$/.test(safe)) return Response.json({ error: "שם גיבוי לא תקין" }, { status: 400 });
  try {
    const dir = await backupDir(current);
    const restored = JSON.parse(gunzipSync(await readFile(path.join(dir, safe))).toString("utf8"));
    if (!Array.isArray(restored.users) || !restored.userData || !restored.ai) throw new Error("מבנה הגיבוי אינו תקין");
    const safetyName = `caloreazi-safety-${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`;
    await writeFile(path.join(dir, safetyName), gzipSync(JSON.stringify(current, null, 2)), { mode: 0o600 });
    addAudit(restored, { userId: currentSession(request)?.userId || null, action: "backup.restored", target: safe, details: `Safety backup: ${safetyName}` });
    await writeState(restored);
    return Response.json({ ok: true, restored: safe, safetyBackup: safetyName });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "שחזור הגיבוי נכשל" }, { status: 400 }); }
}
