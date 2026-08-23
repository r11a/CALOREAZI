import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { saveMediaDataUrl } from "../server/storage.js";

test("production image pipeline resizes and converts uploads to webp", async () => {
  const source = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#d97842" } }).jpeg().toBuffer();
  const output = await sharp(source).resize({ width: 384, height: 384, fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width <= 384 && metadata.height <= 384);
  assert.ok(output.length < source.length);
});

test("meal media is stored as a bounded webp instead of the camera original", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "caloreazi-media-"));
  const previous = process.env.CALOREAZI_DATA_DIR;
  process.env.CALOREAZI_DATA_DIR = directory;
  try {
    const source = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#d97842" } }).png().toBuffer();
    const media = await saveMediaDataUrl({ systemSettings: {} }, `data:image/png;base64,${source.toString("base64")}`, "meal-test");
    assert.equal(media.contentType, "image/webp");
    assert.ok(media.width <= 512 && media.height <= 512);
    assert.ok(media.size < media.sourceSize);
  } finally {
    if (previous === undefined) delete process.env.CALOREAZI_DATA_DIR; else process.env.CALOREAZI_DATA_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
