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

export async function saveMediaDataUrl(state, dataUrl, id) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/); if (!match) return null;
  const target = await probeStorage(state, "gallery"); let file = `${id}.webp`; let contentType = "image/webp"; const source = Buffer.from(match[2], "base64"); let buffer = source;
  try { const sharp = (await import("sharp")).default; buffer = await sharp(source).resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90 }).toBuffer(); }
  catch { file = `${id}.image`; contentType = match[1]; }
  await writeFile(path.join(target.resolved, file), buffer, { mode: 0o600 });
  return { file, contentType, destination: target.destination, relativePath: target.relativePath, size: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex") };
}

export async function readMedia(state, media) { const target = resolveStorageDir(state, "gallery", { ...storageSettings(state), galleryDestination: media.destination, galleryRelativePath: media.relativePath }); return readFile(path.join(target.resolved, path.basename(media.file))); }
export async function deleteMedia(state, media) { if (!media?.file) return; const target = resolveStorageDir(state, "gallery", { ...storageSettings(state), galleryDestination: media.destination, galleryRelativePath: media.relativePath }); await unlink(path.join(target.resolved, path.basename(media.file))).catch((error) => { if (error?.code !== "ENOENT") throw error; }); }
