import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
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

export async function saveMediaDataUrl(state, dataUrl, id) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/); if (!match) return null;
  const target = await probeStorage(state, "gallery"); let file = `${id}.webp`; let contentType = "image/webp"; const source = Buffer.from(match[2], "base64"); let buffer = source;
  try { const sharp = (await import("sharp")).default; buffer = await sharp(source).resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90 }).toBuffer(); }
  catch { file = `${id}.image`; contentType = match[1]; }
  await writeFile(path.join(target.resolved, file), buffer, { mode: 0o600 });
  return { file, contentType, destination: target.destination, relativePath: target.relativePath, size: buffer.length };
}

export async function readMedia(state, media) { const target = resolveStorageDir(state, "gallery", { ...storageSettings(state), galleryDestination: media.destination, galleryRelativePath: media.relativePath }); return readFile(path.join(target.resolved, path.basename(media.file))); }
