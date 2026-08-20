import test from "node:test";
import assert from "node:assert/strict";
import { createSessionCookie, hashPassword, isAdmin, remoteUser, requireUser, verifyPassword } from "../server/auth.js";

test("stores and verifies an admin password using scrypt", async () => {
  const record = await hashPassword("strong-password");
  assert.equal(await verifyPassword("strong-password", record), true);
  assert.equal(await verifyPassword("wrong-password", record), false);
});

test("accepts only a signed non-expired admin session", async () => {
  const adminAuth = await hashPassword("strong-password");
  const user = { id: "admin-1", role: "admin", password: adminAuth };
  const cookie = createSessionCookie(new Request("http://localhost"), user);
  assert.equal(isAdmin({ users: [user] }, new Request("http://localhost", { headers: { cookie } })), true);
  assert.equal(isAdmin({ users: [user] }, new Request("http://localhost", { headers: { cookie: "caloreazi_session=fake.fake" } })), false);
});

test("invalidates a session when the account session version changes", async () => {
  const user = { id: "admin-1", role: "admin", sessionVersion: 2 };
  const cookie = createSessionCookie(new Request("http://localhost"), user);
  assert.equal(isAdmin({ users: [{ ...user, sessionVersion: 2 }] }, new Request("http://localhost", { headers: { cookie } })), true);
  assert.equal(isAdmin({ users: [{ ...user, sessionVersion: 3 }] }, new Request("http://localhost", { headers: { cookie } })), false);
});

test("persists login for 30 days and rejects a disabled account", () => {
  const user = { id: "member-1", role: "user", sessionVersion: 1 };
  const cookie = createSessionCookie(new Request("http://localhost"), user);
  assert.match(cookie, /Max-Age=2592000/);
  const request = new Request("http://localhost", { headers: { cookie } });
  assert.ok(requireUser({ users: [user] }, request));
  assert.equal(requireUser({ users: [{ ...user, disabled: true }] }, request), null);
});

test("trusts Home Assistant identity only through the protected ingress marker", () => {
  const spoofed = new Request("http://localhost", { headers: { "x-remote-user-id": "ha-user" } });
  const ingress = new Request("http://localhost", { headers: { "x-caloreazi-ingress": "1", "x-remote-user-id": "ha-user", "x-remote-user-name": "ronen" } });
  assert.equal(remoteUser(spoofed), null);
  assert.deepEqual(remoteUser(ingress), { id: "ha-user", username: "ronen", displayName: "" });
});
