import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import path from "node:path";
import { calculateDayScore } from "./nutrition.js";

const defaultState = {
  version: 1,
  owner: null,
  adminAuth: null,
  users: [],
  userData: {},
  profile: null,
  today: { date: "", waterMl: 0, meals: [] },
  ai: { provider: "openai", model: "gpt-5.6-terra", encryptedKey: "", inputCost: 2, outputCost: 12, monthlyBudget: 20, softLimit: 80, hardLimit: true },
  aiUsage: [],
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

export async function readState() {
  const files = await paths();
  try {
    const saved = JSON.parse(await readFile(files.state, "utf8"));
    const state = { ...structuredClone(defaultState), ...saved };
    state.ai = { ...defaultState.ai, ...(saved.ai || {}) };
    state.today = { ...defaultState.today, ...(saved.today || {}) };
    state.users = Array.isArray(saved.users) ? saved.users : [];
    state.userData = saved.userData || {};
    state.partnerships = Array.isArray(saved.partnerships) ? saved.partnerships : [];
    state.trash = Array.isArray(saved.trash) ? saved.trash : [];
    state.auditLog = Array.isArray(saved.auditLog) ? saved.auditLog : [];
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

export function addAudit(state, { userId = null, action, target = "system", result = "success", details = "" }) {
  state.auditLog = Array.isArray(state.auditLog) ? state.auditLog : [];
  state.auditLog.push({ id: crypto.randomUUID(), userId, action, target, result, details: String(details || "").slice(0, 300), at: new Date().toISOString() });
  state.auditLog = state.auditLog.slice(-1000);
}

export function ensureUserData(state, userId) {
  const todayDate = new Date().toISOString().slice(0, 10);
  const data = state.userData[userId] || { profile: null, today: { date: todayDate, waterMl: 0, meals: [] } };
  data.history = Array.isArray(data.history) ? data.history : [];
  data.measurements = Array.isArray(data.measurements) ? data.measurements : [];
  data.favorites = Array.isArray(data.favorites) ? data.favorites : [];
  data.activity = Array.isArray(data.activity) ? data.activity : [];
  data.foodCalibration = Array.isArray(data.foodCalibration) ? data.foodCalibration : [];
  data.coachHistory = Array.isArray(data.coachHistory) ? data.coachHistory : [];
  data.today = { ...structuredClone(defaultState.today), ...(data.today || {}) };
  if (data.today.date && data.today.date !== todayDate && (data.today.meals.length || data.today.waterMl)) {
    if (!data.history.some((day) => day.date === data.today.date)) data.history.push(structuredClone(data.today));
    data.today = { date: todayDate, waterMl: 0, meals: [] };
  } else if (!data.today.date) data.today.date = todayDate;
  state.userData[userId] = data;
  return data;
}

export async function writeState(state) {
  const files = await paths();
  await writeFile(files.temp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await rename(files.temp, files.state);
  return state;
}

export async function updateState(updater) {
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
    : { keyConfigured: Boolean(state.ai?.encryptedKey), available: Boolean(state.ai?.encryptedKey) };
  return { ...state, adminAuth: undefined, aiUsage: admin ? state.aiUsage : [], ai, adminConfigured: Boolean(state.adminAuth?.hash) };
}

export function userView(state, userId, admin = false) {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return null;
  const data = ensureUserData(state, userId);
  const ai = admin
    ? { ...state.ai, encryptedKey: undefined, keyConfigured: Boolean(state.ai?.encryptedKey) }
    : { keyConfigured: Boolean(state.ai?.encryptedKey), available: Boolean(state.ai?.encryptedKey) };
  const partnerships = (state.partnerships || []).filter((link) => link.ownerId === userId || link.partnerId === userId).map((link) => {
    const otherId = link.ownerId === userId ? link.partnerId : link.ownerId;
    const other = state.users.find((item) => item.id === otherId);
    return { ...link, other: other ? { id: other.id, name: other.name, email: other.email } : null, direction: link.ownerId === userId ? "outgoing" : "incoming" };
  });
  const sharedProfiles = (state.partnerships || []).filter((link) => link.partnerId === userId && link.status === "accepted").map((link) => {
    const sharedUser = state.users.find((item) => item.id === link.ownerId); const sharedData = ensureUserData(state, link.ownerId);
    const today = link.permissions?.daily ? structuredClone(sharedData.today) : null; if (today && !link.permissions?.meals) today.meals = [];
    return { linkId: link.id, user: sharedUser ? { id: sharedUser.id, name: sharedUser.name, avatar: sharedData.profile?.avatar || "" } : null, permissions: link.permissions, today, measurements: link.permissions?.weight ? sharedData.measurements : [], profile: link.permissions?.weight ? { weight: sharedData.profile?.weight, targetWeight: sharedData.profile?.targetWeight } : null };
  });
  const trackedDates = [...data.history, data.today].filter((day) => day.meals?.length || day.waterMl).map((day) => day.date).sort().reverse();
  let streak = 0; const cursor = new Date();
  if (trackedDates[0] !== cursor.toISOString().slice(0, 10)) cursor.setDate(cursor.getDate() - 1);
  while (trackedDates.includes(cursor.toISOString().slice(0, 10))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return {
    version: state.version,
    owner: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: data.profile?.avatar || "" },
    currentUser: { id: user.id, name: user.name, role: user.role },
    profile: data.profile || null,
    today: { ...structuredClone(defaultState.today), ...(data.today || {}) },
    history: data.history,
    measurements: data.measurements,
    favorites: data.favorites,
    activity: data.activity,
    dailyScore: calculateDayScore(data.today, data.profile, data.activity),
    streak,
    coachHistory: data.coachHistory.slice(-40),
    ai,
    aiUsage: admin ? state.aiUsage : [],
    foods: (state.foodCatalog || []).filter((food) => food.visibility === "shared" || food.ownerId === userId),
    partnerships,
    sharedProfiles,
    adminConfigured: state.users.some((item) => item.role === "admin" && item.password?.hash),
  };
}
