import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { localDateAt, userTimeZone } from "./local-date.js";

const execFileAsync = promisify(execFile);
export function databaseStateEnabled() { return Boolean(process.env.CALOREAZI_DATABASE_URL); }

async function psql(args) {
  if (!process.env.CALOREAZI_DATABASE_URL) throw new Error("CALOREAZI_DATABASE_URL is required");
  const { stdout } = await execFileAsync("psql", [process.env.CALOREAZI_DATABASE_URL, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", ...args], { maxBuffer: 40 * 1024 * 1024, windowsHide: true });
  return stdout.trim();
}

function jsonSql(value) { return `convert_from(decode('${Buffer.from(JSON.stringify(value ?? null), "utf8").toString("base64")}','base64'),'UTF8')::jsonb`; }
function textSql(value) { return value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`; }
function numberSql(value, fallback = 0) { const result = Number(value); return Number.isFinite(result) ? String(result) : String(fallback); }
function dateSql(value) { const result = new Date(value || Date.now()); return textSql(Number.isFinite(result.getTime()) ? result.toISOString() : new Date().toISOString()); }
function validUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")); }
function uuid(value) { return validUuid(value) ? String(value) : randomUUID(); }

async function transaction(statements) {
  const directory = process.env.CALOREAZI_DATA_DIR || (process.platform === "win32" ? path.join(process.cwd(), ".data") : "/data");
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `.normalized-state-${randomUUID()}.sql`);
  await writeFile(file, `BEGIN;\nSELECT pg_advisory_xact_lock(1128353369);\n${statements.join("\n")}\nCOMMIT;\n`, { mode: 0o600 });
  try { await psql(["-f", file]); } finally { await unlink(file).catch(() => undefined); }
}

const readSql = `SELECT encode(convert_to(json_build_object(
 'version',COALESCE((SELECT value FROM app_settings WHERE key='runtime_version'),'1'::jsonb),
 'ai',COALESCE((SELECT value FROM app_settings WHERE key='ai_runtime'),'{}'::jsonb),
 'systemSettings',COALESCE((SELECT value FROM app_settings WHERE key='system'),'{}'::jsonb),
 'users',COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM users),'[]'::jsonb),
 'sessions',COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM sessions),'[]'::jsonb),
 'profiles',COALESCE((SELECT jsonb_object_agg(user_id::text,payload) FROM user_profiles),'{}'::jsonb),
 'days',COALESCE((SELECT jsonb_agg(jsonb_build_object('userId',user_id,'payload',payload) ORDER BY local_date) FROM daily_records),'[]'::jsonb),
 'meals',COALESCE((SELECT jsonb_agg(jsonb_build_object('userId',m.user_id,'localDate',d.local_date,'payload',m.payload) ORDER BY m.occurred_at) FROM meals m LEFT JOIN daily_records d ON d.id=m.daily_record_id WHERE m.deleted_at IS NULL),'[]'::jsonb),
 'measurements',COALESCE((SELECT jsonb_agg(jsonb_build_object('userId',user_id,'payload',payload) ORDER BY measured_at) FROM measurements),'[]'::jsonb),
 'activities',COALESCE((SELECT jsonb_agg(jsonb_build_object('userId',user_id,'payload',payload) ORDER BY occurred_at) FROM activities),'[]'::jsonb),
 'favorites',COALESCE((SELECT jsonb_agg(jsonb_build_object('userId',user_id,'payload',payload) ORDER BY created_at) FROM favorites),'[]'::jsonb),
 'calibrations',COALESCE((SELECT jsonb_agg(jsonb_build_object('userId',user_id,'payload',payload) ORDER BY created_at) FROM food_calibrations),'[]'::jsonb),
 'coach',COALESCE((SELECT jsonb_agg(jsonb_build_object('userId',user_id,'payload',payload) ORDER BY created_at) FROM coach_messages WHERE deleted_at IS NULL),'[]'::jsonb),
 'analysisJobs',COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM analysis_jobs),'[]'::jsonb),
 'partnerships',COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM partnerships),'[]'::jsonb),
 'trash',COALESCE((SELECT jsonb_agg(payload ORDER BY deleted_at) FROM trash_items WHERE permanently_deleted_at IS NULL),'[]'::jsonb),
 'aiUsage',COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM ai_usage_log),'[]'::jsonb),
 'auditLog',COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM audit_log),'[]'::jsonb),
 'foodCatalog',COALESCE((SELECT jsonb_agg(payload ORDER BY created_at) FROM food_catalog),'[]'::jsonb)
)::text,'UTF8'),'base64')`;

function emptyData(profile = null) { return { profile, today: { date: "", waterMl: 0, meals: [] }, history: [], measurements: [], favorites: [], activity: [], foodCalibration: [], coachHistory: [] }; }
export function hydrateDatabaseState(raw, now = new Date()) {
  const state = { version: Number(raw.version || 1), owner: null, adminAuth: null, users: raw.users || [], sessions: raw.sessions || [], userData: {}, ai: raw.ai || {}, aiUsage: raw.aiUsage || [], analysisJobs: raw.analysisJobs || [], foodCatalog: raw.foodCatalog || [], partnerships: raw.partnerships || [], trash: raw.trash || [], auditLog: raw.auditLog || [], systemSettings: raw.systemSettings || {} };
  for (const user of state.users) state.userData[user.id] = emptyData(raw.profiles?.[user.id] || null);
  const getData = (id) => state.userData[id] || (state.userData[id] = emptyData());
  for (const row of raw.days || []) { const date = String(row.payload?.date || ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue; const data = getData(row.userId); const today = localDateAt(now, userTimeZone(data)); const day = { ...row.payload, date, meals: [] }; if (day.date === today) data.today = day; else data.history.push(day); }
  for (const row of raw.meals || []) { const data = getData(row.userId); const today = localDateAt(now, userTimeZone(data)); const candidate = String(row.localDate || ""); const localDate = /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : localDateAt(row.payload?.time || now, userTimeZone(data)); let day = localDate === today ? data.today : data.history.find((item) => item.date === localDate); if (!day || !day.date) { day = { date: localDate, waterMl: Number(day?.waterMl || 0), meals: day?.meals || [] }; if (localDate === today) data.today = day; else data.history.push(day); } day.meals.push(row.payload); }
  for (const [key, target] of [["measurements","measurements"],["activities","activity"],["favorites","favorites"],["calibrations","foodCalibration"],["coach","coachHistory"]]) for (const row of raw[key] || []) getData(row.userId)[target].push(row.payload);
  return state;
}

export async function readDatabaseState() { const encoded = await psql(["-c", readSql]); return encoded ? hydrateDatabaseState(JSON.parse(Buffer.from(encoded, "base64").toString("utf8"))) : null; }

async function readRevision() { return Number(await psql(["-c", "SELECT COALESCE((SELECT value #>> '{}' FROM app_settings WHERE key='runtime_revision'),'0')"])); }

export async function replaceDatabaseState(state, expectedRevision = null) {
  const statements = [
    expectedRevision == null ? "" : `DO $$ BEGIN IF COALESCE((SELECT value #>> '{}' FROM app_settings WHERE key='runtime_revision'),'0')::bigint <> ${Number(expectedRevision)} THEN RAISE EXCEPTION 'CALOREAZI_CONCURRENT_WRITE'; END IF; END $$;`,
    "DELETE FROM audit_log; DELETE FROM ai_usage_log; DELETE FROM trash_items; DELETE FROM partnerships; DELETE FROM analysis_jobs; DELETE FROM food_catalog; DELETE FROM users;",
    `INSERT INTO app_settings(key,value) VALUES ('runtime_version',${jsonSql(state.version || 1)}),('ai_runtime',${jsonSql(state.ai || {})}),('system',${jsonSql(state.systemSettings || {})}),('runtime_revision',to_jsonb(${expectedRevision == null ? "COALESCE((SELECT value #>> '{}' FROM app_settings WHERE key='runtime_revision'),'0')::bigint + 1" : Number(expectedRevision) + 1})) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW();`,
  ];
  const users = state.users || [];
  const hasUser = (id) => users.some((user) => user.id === id);
  for (const user of users) statements.push(`INSERT INTO users(id,username,display_name,password_hash,role,email,ha_user_id,active,session_version,last_login_at,failed_login_count,locked_until,created_at,payload) VALUES('${uuid(user.id)}',${textSql(user.username || user.email)},${textSql(user.name || user.email || "User")},${textSql(JSON.stringify(user.password || null))},${textSql(user.role === "admin" ? "admin" : "member")},${textSql(user.email)},${textSql(user.haUserId)},${user.disabled ? "FALSE" : "TRUE"},${numberSql(user.sessionVersion,1)},${user.lastLogin ? dateSql(user.lastLogin) : "NULL"},${numberSql(user.failedLoginCount)},${user.lockedUntil ? dateSql(user.lockedUntil) : "NULL"},${dateSql(user.createdAt)},${jsonSql(user)});`);
  for (const item of state.sessions || []) if (hasUser(item.userId)) statements.push(`INSERT INTO sessions(id,user_id,token_hash,user_agent,created_at,last_seen_at,expires_at,revoked_at,payload) VALUES('${uuid(item.id)}','${item.userId}',${textSql(item.id)},${textSql(item.userAgent)},${dateSql(item.createdAt)},${dateSql(item.lastSeenAt || item.createdAt)},${dateSql(item.expiresAt)},${item.revokedAt ? dateSql(item.revokedAt) : "NULL"},${jsonSql(item)});`);
  for (const user of users) {
    const data = state.userData?.[user.id] || {};
    if (data.profile) statements.push(`INSERT INTO user_profiles(user_id,onboarding_completed_at,goal,biological_sex,height_cm,current_weight_kg,target_weight_kg,activity_level,daily_calorie_target,daily_protein_target_g,daily_water_target_ml,preferences,payload,updated_at) VALUES('${user.id}',${data.profile.completedAt ? dateSql(data.profile.completedAt) : "NULL"},${textSql(["lose","maintain","gain","nutrition","fitness"].includes(data.profile.goal) ? data.profile.goal : null)},${textSql(["female","male","unspecified"].includes(data.profile.sex) ? data.profile.sex : "unspecified")},${data.profile.height ? numberSql(data.profile.height) : "NULL"},${data.profile.weight ? numberSql(data.profile.weight) : "NULL"},${data.profile.targetWeight ? numberSql(data.profile.targetWeight) : "NULL"},${textSql(data.profile.activity)},${data.profile.calories ? numberSql(data.profile.calories) : "NULL"},${data.profile.protein ? numberSql(data.profile.protein) : "NULL"},${data.profile.waterMl ? numberSql(data.profile.waterMl) : "NULL"},${jsonSql({ diet: data.profile.diet, restrictions: data.profile.restrictions })},${jsonSql(data.profile)},NOW());`);
    const days = [...(data.history || []), ...(data.today?.date ? [data.today] : [])];
    for (const day of days) statements.push(`INSERT INTO daily_records(user_id,local_date,water_ml,payload) VALUES('${user.id}',${textSql(day.date)},${numberSql(day.waterMl)},${jsonSql({ date: day.date, waterMl: Number(day.waterMl || 0), waterEvents: Array.isArray(day.waterEvents) ? day.waterEvents : [] })}) ON CONFLICT(user_id,local_date) DO UPDATE SET water_ml=EXCLUDED.water_ml,payload=EXCLUDED.payload;`);
    for (const day of days) for (const meal of day.meals || []) {
      const source = ["manual","photo","voice","favorite","previous"].includes(meal.source) ? meal.source : "manual";
      const mealId = uuid(meal.id); const mediaId = meal.media ? mealId : null;
      if (meal.media) statements.push(`INSERT INTO media_objects(id,user_id,kind,destination,relative_path,file_name,mime_type,byte_size,sha256) VALUES('${mediaId}','${user.id}','meal',${textSql(meal.media.destination || "internal")},${textSql(meal.media.relativePath || "CALOREAZI/Gallery")},${textSql(meal.media.file)},${textSql(meal.media.contentType || "application/octet-stream")},${numberSql(meal.media.size)},${textSql(meal.media.sha256 || "unavailable")});`);
      statements.push(`INSERT INTO meals(id,user_id,daily_record_id,media_id,name,period,source,occurred_at,kcal,protein_g,carbs_g,fat_g,score,confidence,transcript,payload) SELECT '${mealId}','${user.id}',id,${mediaId ? `'${mediaId}'` : "NULL"},${textSql(meal.name || "Meal")},${textSql(["breakfast","lunch","dinner","snack"].includes(meal.period) ? meal.period : "snack")},${textSql(source)},${dateSql(meal.time)},${numberSql(meal.kcal)},${numberSql(meal.protein)},${numberSql(meal.carbs)},${numberSql(meal.fat)},${meal.score == null ? "NULL" : numberSql(meal.score)},${meal.confidence == null ? "NULL" : numberSql(meal.confidence)},${textSql(meal.transcript)},${jsonSql(meal)} FROM daily_records WHERE user_id='${user.id}' AND local_date=${textSql(day.date)};`);
      for (const item of meal.items || []) { const nutrition = item.nutritionSource; if (nutrition?.source && nutrition?.sourceId) statements.push(`INSERT INTO nutrition_foods(source,source_id,source_version,name_he,name_en,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,verified_at) VALUES(${textSql(nutrition.source)},${textSql(nutrition.sourceId)},${textSql(nutrition.sourceVersion)},${textSql(item.name)},${textSql(item.searchNameEn)},${numberSql(item.kcalPer100)},${numberSql(item.proteinPer100)},${numberSql(item.carbsPer100)},${numberSql(item.fatPer100)},NOW()) ON CONFLICT(source,source_id) DO UPDATE SET source_version=EXCLUDED.source_version,name_he=EXCLUDED.name_he,kcal_per_100g=EXCLUDED.kcal_per_100g,protein_per_100g=EXCLUDED.protein_per_100g,carbs_per_100g=EXCLUDED.carbs_per_100g,fat_per_100g=EXCLUDED.fat_per_100g,verified_at=NOW();`); statements.push(`INSERT INTO meal_items(meal_id,nutrition_food_id,detected_name,confirmed_name,grams,quantity,unit,confidence,nutrition_source,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g) VALUES('${mealId}',${nutrition?.source && nutrition?.sourceId ? `(SELECT id FROM nutrition_foods WHERE source=${textSql(nutrition.source)} AND source_id=${textSql(nutrition.sourceId)})` : "NULL"},${textSql(item.name || "unknown")},${textSql(item.confirmedName)},${numberSql(item.grams,1)},${numberSql(item.quantity,1)},${textSql(item.unit || "portion")},${item.confidence == null ? "NULL" : numberSql(item.confidence)},${textSql(nutrition?.source)},${item.kcalPer100 == null ? "NULL" : numberSql(item.kcalPer100)},${item.proteinPer100 == null ? "NULL" : numberSql(item.proteinPer100)},${item.carbsPer100 == null ? "NULL" : numberSql(item.carbsPer100)},${item.fatPer100 == null ? "NULL" : numberSql(item.fatPer100)});`); }
    }
    for (const item of data.measurements || []) statements.push(`INSERT INTO measurements(id,user_id,measured_at,weight_kg,payload) VALUES('${uuid(item.id)}','${user.id}',${dateSql(item.at || item.date)},${numberSql(item.weight,1)},${jsonSql(item)});`);
    for (const item of data.activity || []) statements.push(`INSERT INTO activities(id,user_id,occurred_at,activity_type,minutes,steps,distance_km,active_calories,payload) VALUES('${uuid(item.id)}','${user.id}',${dateSql(item.time || item.date)},${textSql(item.type || "activity")},${numberSql(item.minutes)},${numberSql(item.steps)},${numberSql(item.distanceKm)},${numberSql(item.activeCalories)},${jsonSql(item)});`);
    for (const item of data.favorites || []) statements.push(`INSERT INTO favorites(id,user_id,payload,created_at) VALUES('${uuid(item.id)}','${user.id}',${jsonSql(item)},${dateSql(item.createdAt)});`);
    for (const item of data.foodCalibration || []) statements.push(`INSERT INTO food_calibrations(user_id,detected_name,confirmed_name,previous_grams,confirmed_grams,quantity,payload,created_at) VALUES('${user.id}',${textSql(item.originalName)},${textSql(item.name || "unknown")},${item.previousGrams == null ? "NULL" : numberSql(item.previousGrams)},${numberSql(item.grams,1)},${numberSql(item.quantity,1)},${jsonSql(item)},${dateSql(item.at)});`);
    for (const item of data.coachHistory || []) statements.push(`INSERT INTO coach_messages(id,user_id,role,content,payload,created_at) VALUES('${uuid(item.id)}','${user.id}',${textSql(["user","assistant","system"].includes(item.role) ? item.role : "assistant")},${textSql(item.content || item.text || "")},${jsonSql(item)},${dateSql(item.createdAt || item.at)});`);
  }
  for (const item of state.analysisJobs || []) if (hasUser(item.userId)) statements.push(`INSERT INTO analysis_jobs(id,client_id,user_id,kind,status,provider,model,attempt_count,confidence,result,error_message,next_attempt_at,created_at,updated_at,completed_at,payload) VALUES('${uuid(item.id)}',${textSql(item.clientId || item.id)},'${item.userId}',${textSql(item.kind || "meal_photo")},${textSql(item.status || "pending")},${textSql(item.provider)},${textSql(item.model)},${numberSql(item.attemptCount)},${textSql(["low","medium","high"].includes(item.confidence) ? item.confidence : null)},${jsonSql(item.result)},${textSql(item.errorMessage)},${item.nextAttemptAt ? dateSql(item.nextAttemptAt) : "NULL"},${dateSql(item.createdAt)},${dateSql(item.updatedAt)},${item.completedAt ? dateSql(item.completedAt) : "NULL"},${jsonSql(item)});`);
  for (const item of state.partnerships || []) if (hasUser(item.ownerId)) statements.push(`INSERT INTO partnerships(id,owner_id,partner_id,invite_email,permissions,status,created_at,updated_at,payload) VALUES('${uuid(item.id)}','${item.ownerId}',${item.partnerId && hasUser(item.partnerId) ? `'${item.partnerId}'` : "NULL"},${textSql(item.inviteEmail || "")},${jsonSql(item.permissions || {})},${textSql(item.status || "pending")},${dateSql(item.createdAt)},${dateSql(item.updatedAt || item.createdAt)},${jsonSql(item)});`);
  for (const item of state.trash || []) if (hasUser(item.userId)) statements.push(`INSERT INTO trash_items(id,user_id,entity_type,entity_id,payload,deleted_at,purge_after) VALUES('${uuid(item.id)}','${item.userId}',${textSql(item.type || "unknown")},${textSql(item.data?.id || item.id)},${jsonSql(item)},${dateSql(item.deletedAt)},${dateSql(new Date(new Date(item.deletedAt || Date.now()).getTime() + Number(state.systemSettings?.trashRetentionDays || 30) * 86400000))});`);
  for (const item of state.aiUsage || []) statements.push(`INSERT INTO ai_usage_log(user_id,provider,model,feature,input_tokens,output_tokens,estimated_cost_usd,status,created_at,payload) VALUES(${item.userId && hasUser(item.userId) ? `'${item.userId}'` : "NULL"},${textSql(item.provider || "unknown")},${textSql(item.model || "unknown")},${textSql(["coach","meal_vision","menu_scan","insight"].includes(item.feature) ? item.feature : item.feature === "meal_photo" ? "meal_vision" : "insight")},${numberSql(item.inputTokens)},${numberSql(item.outputTokens)},${numberSql(item.cost)},'success',${dateSql(item.at)},${jsonSql(item)});`);
  for (const item of state.auditLog || []) statements.push(`INSERT INTO audit_log(user_id,action,entity_type,entity_id,details,created_at,payload) VALUES(${item.userId && hasUser(item.userId) ? `'${item.userId}'` : "NULL"},${textSql(item.action || "unknown")},'runtime',${textSql(item.target)},${jsonSql({ result: item.result, details: item.details })},${dateSql(item.at)},${jsonSql(item)});`);
  for (const item of state.foodCatalog || []) statements.push(`INSERT INTO food_catalog(id,owner_id,visibility,payload,created_at) VALUES('${uuid(item.id)}',${item.ownerId && hasUser(item.ownerId) ? `'${item.ownerId}'` : "NULL"},${textSql(item.visibility === "shared" ? "shared" : "private")},${jsonSql(item)},${dateSql(item.createdAt)});`);
  await transaction(statements);
  return state;
}

export async function updateDatabaseState(updater, defaultState) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const revision = await readRevision();
    const draft = structuredClone(await readDatabaseState() || defaultState);
    const next = await updater(draft) || draft;
    try { return await replaceDatabaseState(next, revision); }
    catch (error) { if (!String(error?.message || error).includes("CALOREAZI_CONCURRENT_WRITE")) throw error; }
  }
  throw new Error("הנתונים השתנו במקביל. יש לנסות שוב");
}

export async function databaseHealth() {
  if (!databaseStateEnabled()) return { status: "unconfigured", configured: false };
  try { return JSON.parse(await psql(["-c", "SELECT json_build_object('status','ok','configured',true,'sizeBytes',pg_database_size(current_database()),'migrationCount',(SELECT COUNT(*) FROM schema_migrations))::text"])); }
  catch (error) { return { status: "error", configured: true, error: error instanceof Error ? error.message : "database unavailable" }; }
}

export async function databaseDiagnostics() {
  if (!databaseStateEnabled()) return { status: "unconfigured", configured: false, sizeBytes: 0, records: 0, tables: [] };
  try { const encoded = await psql(["-c", `SELECT encode(convert_to(json_build_object('status','ok','configured',true,'sizeBytes',pg_database_size(current_database()),'records',(SELECT COALESCE(SUM(n_live_tup),0)::bigint FROM pg_stat_user_tables),'tables',(SELECT json_agg(json_build_object('name',relname,'rows',n_live_tup,'deadRows',n_dead_tup,'sizeBytes',pg_total_relation_size(relid)) ORDER BY pg_total_relation_size(relid) DESC) FROM pg_stat_user_tables))::text,'UTF8'),'base64')`]); return JSON.parse(Buffer.from(encoded, "base64").toString("utf8")); }
  catch (error) { return { status: "error", configured: true, sizeBytes: 0, records: 0, tables: [], error: error instanceof Error ? error.message : "database unavailable" }; }
}

export async function maintainDatabase(action) {
  if (!databaseStateEnabled()) throw new Error("Database is not configured");
  if (action === "integrity") return { ok: true, result: await psql(["-c", "SELECT CASE WHEN COUNT(*)=0 THEN 'ok' ELSE 'orphaned meals' END FROM meals m LEFT JOIN users u ON u.id=m.user_id WHERE u.id IS NULL"]) };
  if (action === "optimize") { await psql(["-c", "VACUUM (ANALYZE)"]); return { ok: true, result: "vacuum analyze completed" }; }
  throw new Error("Unsupported maintenance action");
}

export async function exportDatabase(file) { await execFileAsync("pg_dump", [process.env.CALOREAZI_DATABASE_URL, "--format=custom", "--no-owner", "--no-privileges", "--file", file], { windowsHide: true }); }
export async function restoreDatabase(file) { await execFileAsync("pg_restore", ["--clean", "--if-exists", "--no-owner", "--no-privileges", "--dbname", process.env.CALOREAZI_DATABASE_URL, file], { windowsHide: true }); }
