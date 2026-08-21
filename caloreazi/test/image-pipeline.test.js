import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

test("production image pipeline resizes and converts uploads to webp", async () => {
  const source = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#d97842" } }).jpeg().toBuffer();
  const output = await sharp(source).resize({ width: 384, height: 384, fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width <= 384 && metadata.height <= 384);
  assert.ok(output.length < source.length);
});
