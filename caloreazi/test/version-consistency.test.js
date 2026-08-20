import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("release version stays synchronized across runtime and release notes", async () => {
  const packageData = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const version = packageData.version;
  const files = await Promise.all([
    "../config.yaml",
    "../Dockerfile",
    "../app/health/route.ts",
    "../README.md",
    "../CHANGELOG.md",
    "../public/sw.js",
  ].map((file) => readFile(new URL(file, import.meta.url), "utf8")));
  for (const contents of files) assert.match(contents, new RegExp(version.replaceAll(".", "\\.")));
});
