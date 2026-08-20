import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const COOKIE = "caloreazi_session";
const SESSION_DAYS = 30;

export function remoteUser(request) {
  if (request.headers.get("x-caloreazi-ingress") !== "1") return null;
  const id = request.headers.get("x-remote-user-id");
  return id ? { id, username: request.headers.get("x-remote-user-name") || "", displayName: request.headers.get("x-remote-user-display-name") || "" } : null;
}

export async function hashPassword(password, salt = randomBytes(16).toString("base64url")) {
  const hash = await scrypt(password, salt, 64);
  return { salt, hash: Buffer.from(hash).toString("base64url") };
}

export async function verifyPassword(password, record) {
  if (!record?.salt || !record?.hash) return false;
  const actual = Buffer.from(await scrypt(password, record.salt, 64));
  const expected = Buffer.from(record.hash, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function signingSecret() {
  let source = process.env.CALOREAZI_SESSION_SECRET;
  if (!source) {
    const dir = process.env.CALOREAZI_DATA_DIR || (process.platform === "win32" ? path.join(process.cwd(), ".data") : "/data");
    const file = path.join(dir, ".session-secret");
    mkdirSync(dir, { recursive: true });
    try { source = readFileSync(file, "utf8").trim(); }
    catch (error) { if (error?.code !== "ENOENT") throw error; source = randomBytes(32).toString("base64url"); writeFileSync(file, source, { mode: 0o600 }); }
  }
  return createHmac("sha256", source).update("admin-session-v1").digest();
}

function signature(payload) { return createHmac("sha256", signingSecret()).update(payload).digest("base64url"); }
function validSignature(payload, sentSignature) { const expected = Buffer.from(signature(payload)); const actual = Buffer.from(String(sentSignature || "")); return expected.length === actual.length && timingSafeEqual(expected, actual); }

function cookiePath(request) { return request?.headers.get("x-ingress-path") || "/"; }

export function createSessionCookie(request, user, sessionId = randomBytes(18).toString("base64url")) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const payload = Buffer.from(JSON.stringify({ sid: sessionId, userId: user.id, role: user.role, sessionVersion: Number(user.sessionVersion || 1), exp: Date.now() + maxAge * 1000 })).toString("base64url");
  const secure = request?.headers.get("x-forwarded-proto") === "https" || new URL(request?.url || "http://localhost").protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${payload}.${signature(payload)}; Path=${cookiePath(request)}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(request) { return `${COOKIE}=; Path=${cookiePath(request)}; HttpOnly; SameSite=Strict; Max-Age=0`; }

export function currentSession(request) {
  const value = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!value) return null;
  const [payload, sentSignature] = value.split(".");
  if (!payload || !sentSignature || !validSignature(payload, sentSignature)) return null;
  try { const session = JSON.parse(Buffer.from(payload, "base64url").toString()); return session.userId && session.exp > Date.now() ? session : null; }
  catch { return null; }
}

function sessionUser(state, session) { if (!session) return null; if (Array.isArray(state.sessions)) { const active = state.sessions.find((item) => item.id === session.sid && item.userId === session.userId && !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now()); if (!active) return null; } return state.users.find((item) => item.id === session.userId && item.disabled !== true && Number(item.sessionVersion || 1) === Number(session.sessionVersion || 1)); }
export function isAdmin(state, request) { const session = currentSession(request); const user = sessionUser(state, session); return Boolean(session?.role === "admin" && user?.role === "admin"); }
export function requireAdmin(state, request) { return isAdmin(state, request) ? null : Response.json({ error: "נדרשת התחברות מנהל" }, { status: 403 }); }
export function requireUser(state, request) { const session = currentSession(request); return sessionUser(state, session) ? session : null; }
