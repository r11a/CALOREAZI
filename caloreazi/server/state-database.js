import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export function databaseStateEnabled() { return Boolean(process.env.CALOREAZI_DATABASE_URL); }

async function query(sql) {
  const { stdout } = await execFileAsync("psql", [process.env.CALOREAZI_DATABASE_URL, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    maxBuffer: 30 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout.trim();
}

function encodedJson(value) { return Buffer.from(JSON.stringify(value), "utf8").toString("base64"); }
function jsonExpression(value) { return `convert_from(decode('${encodedJson(value)}','base64'),'UTF8')::jsonb`; }

export async function readDatabaseState() {
  const row = await query("SELECT revision || E'\\t' || encode(convert_to(state::text,'UTF8'),'base64') FROM runtime_state WHERE singleton=TRUE");
  if (!row) return null;
  const tab = row.indexOf("\t");
  return { revision: Number(row.slice(0, tab)), state: JSON.parse(Buffer.from(row.slice(tab + 1), "base64").toString("utf8")) };
}

export async function seedDatabaseState(state) {
  await query(`INSERT INTO runtime_state(singleton, revision, state) VALUES(TRUE,1,${jsonExpression(state)}) ON CONFLICT(singleton) DO NOTHING`);
  return readDatabaseState();
}

export async function replaceDatabaseState(state) {
  await query(`INSERT INTO runtime_state(singleton, revision, state) VALUES(TRUE,1,${jsonExpression(state)}) ON CONFLICT(singleton) DO UPDATE SET state=EXCLUDED.state,revision=runtime_state.revision+1,updated_at=NOW()`);
  return state;
}

export async function compareAndSwapDatabaseState(revision, state) {
  const result = await query(`UPDATE runtime_state SET state=${jsonExpression(state)},revision=revision+1,updated_at=NOW() WHERE singleton=TRUE AND revision=${Number(revision)} RETURNING revision`);
  return Boolean(result);
}

export async function databaseHealth() {
  if (!databaseStateEnabled()) return { status: "file-fallback", configured: false };
  try { const value = await query("SELECT json_build_object('status','ok','configured',true,'sizeBytes',pg_database_size(current_database()),'migrationCount',(SELECT COUNT(*) FROM schema_migrations))::text"); return JSON.parse(value); }
  catch (error) { return { status: "error", configured: true, error: error instanceof Error ? error.message : "database unavailable" }; }
}
