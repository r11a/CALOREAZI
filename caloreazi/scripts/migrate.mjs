import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(root, "migrations");
const databaseUrl = process.env.CALOREAZI_DATABASE_URL;

if (!databaseUrl) {
  console.error("CALOREAZI_DATABASE_URL is required; refusing to start without the configured database");
  process.exit(1);
}

async function psql(args, input) {
  return execFileAsync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", ...args], {
    input,
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });
}

const files = (await readdir(migrationsDir)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
for (const file of files) {
  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  await psql(["-f", path.join(migrationsDir, file)]);
  console.log(`migration ${file} applied (${checksum.slice(0, 12)})`);
}
