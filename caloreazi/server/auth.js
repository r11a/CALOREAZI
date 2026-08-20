import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const COOKIE = "caloreazi_session";

export function remoteUser(request) {
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
  const source = process.env.CALOREAZI_SESSION_SECRET || process.env.SUPERVISOR_TOKEN || "caloreazi-local-development-only";
  return createHmac("sha256", source).update("admin-session-v1").digest();
}

function signature(payload) { return createHmac("sha256", signingSecret()).update(payload).digest("base64url"); }

function cookiePath(request) { return request?.headers.get("x-ingress-path") || "/"; }

export function createSessionCookie(request, user) {
  const payload = Buffer.from(JSON.stringify({ userId: user.id, role: user.role, exp: Date.now() + 12 * 60 * 60 * 1000 })).toString("base64url");
  return `${COOKIE}=${payload}.${signature(payload)}; Path=${cookiePath(request)}; HttpOnly; SameSite=Strict; Max-Age=43200`;
}

export function clearSessionCookie(request) { return `${COOKIE}=; Path=${cookiePath(request)}; HttpOnly; SameSite=Strict; Max-Age=0`; }

export function currentSession(request) {
  const value = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!value) return null;
  const [payload, sentSignature] = value.split(".");
  if (!payload || !sentSignature || signature(payload) !== sentSignature) return null;
  try { const session = JSON.parse(Buffer.from(payload, "base64url").toString()); return session.userId && session.exp > Date.now() ? session : null; }
  catch { return null; }
}

export function isAdmin(state, request) { const session = currentSession(request); return Boolean(session?.role === "admin" && state.users.some((item) => item.id === session.userId && item.role === "admin")); }
export function requireAdmin(state, request) { return isAdmin(state, request) ? null : Response.json({ error: "נדרשת התחברות מנהל" }, { status: 403 }); }
export function requireUser(state, request) { const session = currentSession(request); return session && state.users.some((item) => item.id === session.userId) ? session : null; }
