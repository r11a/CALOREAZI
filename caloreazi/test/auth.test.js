import test from "node:test";
import assert from "node:assert/strict";
import { createSessionCookie, hashPassword, isAdmin, verifyPassword } from "../server/auth.js";

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
