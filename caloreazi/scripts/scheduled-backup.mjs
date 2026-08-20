import { createHash } from "node:crypto";
import { readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { probeStorage } from "../server/storage.js";
import { addAudit, readState, updateState } from "../server/store.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const state = await readState();
const policy = { enabled: state.systemSettings?.automaticBackup !== false, hour: Number(state.systemSettings?.backupHour ?? 3), retention: Number(state.systemSettings?.backupRetention || 14) };
if (!policy.enabled) process.exit(0);
const localHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: process.env.TZ || "Asia/Jerusalem", hour: "2-digit", hour12: false }).format(new Date()));
const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.TZ || "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
if (localHour !== policy.hour || state.systemSettings?.lastAutomaticBackupDate === localDate) process.exit(0);

const serialized = JSON.stringify(state); const archive = { format: "caloreazi-backup-v2", type: "database", createdAt: new Date().toISOString(), schemaVersion: state.version, payloadSha256: digest(serialized), payload: state };
const dir = (await probeStorage(state, "backup")).resolved; const name = `caloreazi-database-auto-${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`; const file = path.join(dir, name);
await writeFile(file, gzipSync(JSON.stringify(archive)), { mode: 0o600 });
const verified = JSON.parse(gunzipSync(await readFile(file)).toString("utf8"));
if (digest(JSON.stringify(verified.payload)) !== verified.payloadSha256) { await unlink(file); throw new Error("automatic backup verification failed"); }
const backups = await Promise.all((await readdir(dir)).filter((item) => /^caloreazi-.*\.json\.gz$/.test(item)).map(async (item) => ({ item, mtime: (await stat(path.join(dir, item))).mtimeMs })));
for (const old of backups.sort((a, b) => b.mtime - a.mtime).slice(policy.retention)) await unlink(path.join(dir, old.item));
const fileDigest = digest(await readFile(file));
await updateState((latest) => { latest.systemSettings.lastAutomaticBackupDate = localDate; addAudit(latest, { action: "backup.automatic_created", target: name, details: fileDigest }); return latest; });
