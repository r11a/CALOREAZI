import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import path from "node:path";
import { calculateDayScore } from "./nutrition.js";
import { databaseStateEnabled, readDatabaseState, replaceDatabaseState, updateDatabaseState } from "./state-database.js";
import { localDateAt, userTimeZone } from "./local-date.js";

const defaultState = {
  version: 1,
  owner: null,
  adminAuth: null,
  users: [],
  sessions: [],
  userData: {},
  profile: null,
  today: { date: "", waterMl: 0, meals: [] },
  ai: { provider: "openai", model: "gpt-5.6-terra", roles: { coach: { provider: "openai", model: "gpt-5.6-terra" }, vision: { provider: "openai", model: "gpt-5.6-terra" }, image: { provider: "openai", model: "gpt-image-1-mini" } }, encryptedKey: "", inputCost: 2, outputCost: 12, monthlyBudget: 20, softLimit: 80, hardLimit: true },
  aiUsage: [],
  analysisJobs: [],
  foodCatalog: [],
  partnerships: [],
  trash: [],
  auditLog: [],
  systemSettings: { trashRetentionDays: 30, backupRetention: 14, storage: { backupDestination: "internal", backupRelativePath: "CALOREAZI/Backups", galleryDestination: "internal", galleryRelativePath: "CALOREAZI/Gallery" } },
};

function dataDir() {
  return process.env.CALOREAZI_DATA_DIR || (process.platform === "win32" ? path.join(process.cwd(), ".data") : "/data");
}

export function getDataDir() { return dataDir(); }

async function paths() {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  return { state: path.join(dir, "caloreazi.json"), temp: path.join(dir, "caloreazi.tmp"), secret: path.join(dir, ".caloreazi-secret") };
}

async function readFileState() {
  const files = await paths();
  try {
    const saved = JSON.parse(await readFile(files.state, "utf8"));
    const state = { ...structuredClone(defaultState), ...saved };
    state.ai = { ...defaultState.ai, ...(saved.ai || {}) };
    state.today = { ...defaultState.today, ...(saved.today || {}) };
    state.users = Array.isArray(saved.users) ? saved.users : [];
    state.sessions = Array.isArray(saved.sessions) ? saved.sessions : [];
    state.userData = saved.userData || {};
    state.partnerships = Array.isArray(saved.partnerships) ? saved.partnerships : [];
    state.trash = Array.isArray(saved.trash) ? saved.trash : [];
    state.auditLog = Array.isArray(saved.auditLog) ? saved.auditLog : [];
    state.analysisJobs = Array.isArray(saved.analysisJobs) ? saved.analysisJobs : [];
    state.systemSettings = { ...defaultState.systemSettings, ...(saved.systemSettings || {}), storage: { ...defaultState.systemSettings.storage, ...(saved.systemSettings?.storage || {}) } };
    if (state.owner && state.users.length === 0) {
      state.users = [{ ...state.owner, password: state.adminAuth || null }];
      state.userData[state.owner.id] = { profile: state.profile, today: state.today };
    }
    return state;
  } catch (error) {
    if (error?.code === "ENOENT") return structuredClone(defaultState);
    throw error;
  }
}

export async function readState() {
  if (!databaseStateEnabled()) { if (process.env.CALOREAZI_ALLOW_FILE_STORE === "1" || process.env.NODE_ENV !== "production") return readFileState(); throw new Error("CALOREAZI_DATABASE_URL is required in production"); }
  const stored = await readDatabaseState();
  if (stored) return { ...structuredClone(defaultState), ...stored };
  await replaceDatabaseState(structuredClone(defaultState));
  return structuredClone(defaultState);
}

export function addAudit(state, { userId = null, action, target = "system", result = "success", details = "" }) {
  state.auditLog = Array.isArray(state.auditLog) ? state.auditLog : [];
  state.auditLog.push({ id: crypto.randomUUID(), userId, action, target, result, details: String(details || "").slice(0, 300), at: new Date().toISOString() });
  state.auditLog = state.auditLog.slice(-1000);
}

export function ensureUserData(state, userId) {
  const data = state.userData[userId] || { profile: null, today: { date: "", waterMl: 0, meals: [] } };
  data.history = Array.isArray(data.history) ? data.history : [];
  data.measurements = Array.isArray(data.measurements) ? data.measurements : [];
  data.favorites = Array.isArray(data.favorites) ? data.favorites : [];
  data.activity = Array.isArray(data.activity) ? data.activity : [];
  data.foodCalibration = Array.isArray(data.foodCalibration) ? data.foodCalibration : [];
  data.coachHistory = Array.isArray(data.coachHistory) ? data.coachHistory : [];
  data.today = { ...structuredClone(defaultState.today), ...(data.today || {}) };
  const todayDate = localDateAt(new Date(), userTimeZone(data));
  const manualDay = data.profile?.dayBoundaryMode === "manual";
  if (!manualDay && data.today.date && data.today.date !== todayDate) {
    if (data.today.meals.length || data.today.waterMl) {
      const archived = data.history.find((day) => day.date === data.today.date);
      if (archived) {
        archived.meals = [...(archived.meals || []), ...data.today.meals.filter((meal) => !(archived.meals || []).some((item) => item.id === meal.id))];
        archived.waterEvents = [...(archived.waterEvents || []), ...(data.today.waterEvents || []).filter((event) => !(archived.waterEvents || []).some((item) => item.id === event.id))];
        archived.waterMl = archived.waterEvents.length ? archived.waterEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0) : Math.max(Number(archived.waterMl || 0), Number(data.today.waterMl || 0));
      } else data.history.push(structuredClone(data.today));
    }
    const existingToday = data.history.find((day) => day.date === todayDate);
    if (existingToday) {
      data.today = { ...existingToday, meals: [...(existingToday.meals || [])], waterEvents: [...(existingToday.waterEvents || [])] };
      data.history = data.history.filter((day) => day !== existingToday);
    } else data.today = { date: todayDate, waterMl: 0, waterEvents: [], meals: [] };
  } else if (!data.today.date) data.today.date = todayDate;
  if (manualDay && !data.profile.activeDayStartedAt) data.profile.activeDayStartedAt = new Date().toISOString();
  if (manualDay) data.profile.activeDayDate = data.today.date;
  state.userData[userId] = data;
  return data;
}

export async function writeState(state) {
  if (databaseStateEnabled()) return replaceDatabaseState(state);
  if (process.env.CALOREAZI_ALLOW_FILE_STORE !== "1" && process.env.NODE_ENV === "production") throw new Error("CALOREAZI_DATABASE_URL is required in production");
  const files = await paths();
  await writeFile(files.temp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await rename(files.temp, files.state);
  return state;
}

export async function updateState(updater) {
  if (databaseStateEnabled()) {
    return updateDatabaseState(updater, structuredClone(defaultState));
  }
  const state = await readState();
  const next = await updater(state) || state;
  return writeState(next);
}

async function encryptionKey() {
  const files = await paths();
  try { return Buffer.from(await readFile(files.secret, "utf8"), "base64"); }
  catch (error) {
    if (error?.code !== "ENOENT") throw error;
    const key = randomBytes(32);
    await writeFile(files.secret, key.toString("base64"), { mode: 0o600 });
    return key;
  }
}

export async function encryptSecret(value) {
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", await encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(".");
}

export async function decryptSecret(value) {
  if (!value) return "";
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", await encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function publicState(state, admin = false) {
  const ai = admin
    ? { ...state.ai, encryptedKey: undefined, keyConfigured: Boolean(state.ai?.encryptedKey) }
    : { keyConfigured: Boolean(state.ai?.encryptedKey), available: Boolean(state.ai?.encryptedKey), voiceProvider: state.ai?.roles?.coach?.provider || state.ai?.provider || "openai" };
  return { ...state, adminAuth: undefined, aiUsage: admin ? state.aiUsage : [], ai, adminConfigured: Boolean(state.adminAuth?.hash) };
}

export function userView(state, userId, admin = false) {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return null;
  const data = ensureUserData(state, userId);
  const ai = admin
    ? { ...state.ai, encryptedKey: undefined, keyConfigured: Boolean(state.ai?.encryptedKey) }
    : { keyConfigured: Boolean(state.ai?.encryptedKey), available: Boolean(state.ai?.encryptedKey), voiceProvider: state.ai?.roles?.coach?.provider || state.ai?.provider || "openai" };
  const usernameFor = (item) => {
    const username = String(item?.username || "").trim();
    return username && !username.includes("@") ? username : String(item?.name || "משתמש").trim();
  };
  const partnerships = (state.partnerships || []).filter((link) => link.ownerId === userId || link.partnerId === userId).map((link) => {
    const otherId = link.ownerId === userId ? link.partnerId : link.ownerId;
    const other = state.users.find((item) => item.id === otherId);
    return { ...link, other: other ? { id: other.id, name: other.name, username: usernameFor(other) } : null, direction: link.ownerId === userId ? "outgoing" : "incoming" };
  });
  const sharedProfiles = (state.partnerships || []).filter((link) => link.partnerId === userId && link.status === "accepted").map((link) => {
    const sharedUser = state.users.find((item) => item.id === link.ownerId); const sharedData = ensureUserData(state, link.ownerId);
    const today = link.permissions?.daily || link.permissions?.meals ? structuredClone(sharedData.today) : null; if (today && !link.permissions?.meals) today.meals = []; if (today && !link.permissions?.daily) { today.waterMl = 0; today.waterEvents = []; }
    const recentDays = link.permissions?.trends ? [...sharedData.history, sharedData.today].slice(-30).map((day) => ({ date: day.date, score: calculateDayScore(day, sharedData.profile, sharedData.activity).score })) : [];
    return { linkId: link.id, user: sharedUser ? { id: sharedUser.id, name: sharedUser.name, username: usernameFor(sharedUser), avatar: sharedData.profile?.avatar || "" } : null, permissions: link.permissions, today, measurements: link.permissions?.weight ? sharedData.measurements : [], trends: recentDays, profile: link.permissions?.weight ? { weight: sharedData.profile?.weight, targetWeight: sharedData.profile?.targetWeight } : null };
  });
  const trackedDates = [...data.history, data.today].filter((day) => day.meals?.length || day.waterMl).map((day) => day.date).sort().reverse();
  let streak = 0; const cursor = new Date(); const timeZone = userTimeZone(data);
  if (trackedDates[0] !== localDateAt(cursor, timeZone)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (trackedDates.includes(localDateAt(cursor, timeZone))) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return {
    version: state.version,
    owner: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: data.profile?.avatar || "" },
    currentUser: { id: user.id, name: user.name, role: user.role },
    profile: data.profile || null,
    today: { ...structuredClone(defaultState.today), ...(data.today || {}) },
    history: data.history.map((day) => ({ ...day, dailyScore: calculateDayScore(day, data.profile, data.activity) })),
    measurements: data.measurements,
    favorites: data.favorites,
    activity: data.activity,
    dailyScore: calculateDayScore(data.today, data.profile, data.activity),
    streak,
    coachHistory: data.coachHistory.filter((item) => !data.profile?.coachHiddenBefore || new Date(item.at || item.createdAt || 0).getTime() > new Date(data.profile.coachHiddenBefore).getTime()).slice(-40),
    ai,
    aiUsage: admin ? state.aiUsage : [],
    foods: (state.foodCatalog || []).filter((food) => food.visibility === "shared" || food.ownerId === userId),
    shareCandidates: state.users.filter((item) => item.id !== userId && !item.disabled).map((item) => ({ id: item.id, name: usernameFor(item) })),
    partnerships,
    sharedProfiles,
    adminConfigured: state.users.some((item) => item.role === "admin" && item.password?.hash),
  };
}
