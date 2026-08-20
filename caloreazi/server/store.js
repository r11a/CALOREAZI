import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import path from "node:path";

const defaultState = {
  version: 1,
  owner: null,
  adminAuth: null,
  users: [],
  userData: {},
  profile: null,
  today: { date: "", waterMl: 0, meals: [] },
  ai: { provider: "openai", model: "gpt-5-mini", encryptedKey: "", inputCost: 0.25, outputCost: 2, monthlyBudget: 20, softLimit: 80, hardLimit: true },
  aiUsage: [],
};

function dataDir() {
  return process.env.CALOREAZI_DATA_DIR || (process.platform === "win32" ? path.join(process.cwd(), ".data") : "/data");
}

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
  const data = state.userData[userId] || { profile: null, today: structuredClone(defaultState.today) };
  const ai = admin
    ? { ...state.ai, encryptedKey: undefined, keyConfigured: Boolean(state.ai?.encryptedKey) }
    : { keyConfigured: Boolean(state.ai?.encryptedKey), available: Boolean(state.ai?.encryptedKey) };
  return {
    version: state.version,
    owner: { id: user.id, name: user.name, email: user.email, role: user.role },
    currentUser: { id: user.id, name: user.name, role: user.role },
    profile: data.profile || null,
    today: { ...structuredClone(defaultState.today), ...(data.today || {}) },
    ai,
    aiUsage: admin ? state.aiUsage : [],
    adminConfigured: state.users.some((item) => item.role === "admin" && item.password?.hash),
  };
}
