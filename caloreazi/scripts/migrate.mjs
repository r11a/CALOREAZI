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

async function psql(args) {
  return execFileAsync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", ...args], {
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });
}

const files = (await readdir(migrationsDir)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
await psql(["-X", "-q", "-c", "CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, checksum TEXT, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT;"]);
for (const file of files) {
  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const version = path.basename(file, ".sql");
  const { stdout } = await psql(["-X", "-q", "-A", "-t", "-c", `SELECT COALESCE(checksum,'') FROM schema_migrations WHERE version='${version.replaceAll("'", "''")}'`]);
  const recorded = stdout.trim();
  if (recorded && recorded !== checksum) throw new Error(`Migration checksum mismatch: ${file}`);
  if (recorded === checksum) { console.log(`migration ${file} already applied`); continue; }
  await psql(["-X", "-q", "-f", path.join(migrationsDir, file)]);
  await psql(["-X", "-q", "-c", `INSERT INTO schema_migrations(version,checksum) VALUES('${version.replaceAll("'", "''")}','${checksum}') ON CONFLICT(version) DO UPDATE SET checksum=EXCLUDED.checksum`]);
  console.log(`migration ${file} applied (${checksum.slice(0, 12)})`);
}
