import { mkdir, readFile, readdir, stat, statfs, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { getDataDir } from "./store.js";

export const DEFAULT_STORAGE = { backupDestination: "internal", backupRelativePath: "CALOREAZI/Backups", galleryDestination: "internal", galleryRelativePath: "CALOREAZI/Gallery" };

function cleanRelative(value, fallback) {
  const clean = String(value || fallback).replace(/\\/g, "/").split("/").filter((part) => part && part !== ".").join("/");
  if (!clean || clean.split("/").includes("..")) throw new Error("הנתיב היחסי אינו תקין");
  return clean;
}

function mountRoot(destination) {
  if (destination === "share") return process.env.CALOREAZI_SHARE_DIR || (process.platform === "win32" ? path.join(getDataDir(), "share") : "/share");
  if (destination === "media") return process.env.CALOREAZI_MEDIA_DIR || (process.platform === "win32" ? path.join(getDataDir(), "media") : "/media");
  return getDataDir();
}

export function storageSettings(state) { return { ...DEFAULT_STORAGE, ...(state.systemSettings?.storage || {}) }; }

export function resolveStorageDir(state, kind, snapshot) {
  const settings = snapshot || storageSettings(state); const destination = kind === "backup" ? settings.backupDestination : settings.galleryDestination;
  const relativePath = cleanRelative(kind === "backup" ? settings.backupRelativePath : settings.galleryRelativePath, kind === "backup" ? DEFAULT_STORAGE.backupRelativePath : DEFAULT_STORAGE.galleryRelativePath);
  const root = path.resolve(mountRoot(destination)); const resolved = path.resolve(root, destination === "internal" ? (kind === "backup" ? "backups" : "gallery") : relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error("הנתיב אינו מורשה");
  return { destination, relativePath, resolved };
}

export async function probeStorage(state, kind, snapshot) { const target = resolveStorageDir(state, kind, snapshot); await mkdir(target.resolved, { recursive: true }); const probe = path.join(target.resolved, `.caloreazi-write-test-${crypto.randomUUID()}`); await writeFile(probe, "ok"); await unlink(probe); return target; }
async function directorySize(directory) { let total = 0; for (const entry of await readdir(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (entry.isDirectory()) total += await directorySize(file); else if (entry.isFile()) total += (await stat(file)).size; } return total; }
export async function storageCapacity(target) { const filesystem = await statfs(target.resolved); return { usedByCaloreaziBytes: await directorySize(target.resolved), filesystemTotalBytes: Number(filesystem.blocks) * Number(filesystem.bsize), filesystemFreeBytes: Number(filesystem.bavail) * Number(filesystem.bsize) }; }

export async function saveMediaDataUrl(state, dataUrl, id, options = {}) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/); if (!match) return null;
  let target; let pendingDestination = null; try { target = await probeStorage(state, "gallery"); } catch (error) { const desired = resolveStorageDir(state, "gallery"); if (desired.destination === "internal") throw error; pendingDestination = { destination: desired.destination, relativePath: desired.relativePath }; target = await probeStorage(state, "gallery", { ...storageSettings(state), galleryDestination: "internal", galleryRelativePath: "gallery-pending" }); } let file = `${id}.webp`; let contentType = "image/webp"; const source = Buffer.from(match[2], "base64"); let buffer = source;
  try { const sharp = (await import("sharp")).default; const maxSize = Math.max(192, Math.min(1280, Number(options.maxSize) || 640)); const quality = Math.max(55, Math.min(90, Number(options.quality) || 80)); buffer = await sharp(source).resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true }).webp({ quality, alphaQuality: 85 }).toBuffer(); }
  catch { file = `${id}.image`; contentType = match[1]; }
  await writeFile(path.join(target.resolved, file), buffer, { mode: 0o600 });
  return { file, contentType, destination: target.destination, relativePath: target.relativePath, size: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex"), ...(pendingDestination ? { pendingDestination, pendingSince: new Date().toISOString() } : {}) };
}

export async function syncPendingMedia(state) {
  let synced = 0; const media = Object.values(state.userData || {}).flatMap((data) => [...(data.history || []), data.today].flatMap((day) => day?.meals || []).map((meal) => meal.media).filter((item) => item?.pendingDestination));
  for (const item of media) { const source = resolveStorageDir(state, "gallery", { ...storageSettings(state), galleryDestination: item.destination, galleryRelativePath: item.relativePath }); const destination = resolveStorageDir(state, "gallery", { ...storageSettings(state), galleryDestination: item.pendingDestination.destination, galleryRelativePath: item.pendingDestination.relativePath }); await mkdir(destination.resolved, { recursive: true }); const name = path.basename(item.file); await writeFile(path.join(destination.resolved, name), await readFile(path.join(source.resolved, name)), { mode: 0o600 }); await unlink(path.join(source.resolved, name)); item.destination = item.pendingDestination.destination; item.relativePath = item.pendingDestination.relativePath; delete item.pendingDestination; delete item.pendingSince; synced += 1; }
  return synced;
}

export async function readMedia(state, media) { const target = resolveStorageDir(state, "gallery", { ...storageSettings(state), galleryDestination: media.destination, galleryRelativePath: media.relativePath }); return readFile(path.join(target.resolved, path.basename(media.file))); }
export async function deleteMedia(state, media) { if (!media?.file) return; const target = resolveStorageDir(state, "gallery", { ...storageSettings(state), galleryDestination: media.destination, galleryRelativePath: media.relativePath }); await unlink(path.join(target.resolved, path.basename(media.file))).catch((error) => { if (error?.code !== "ENOENT") throw error; }); }
