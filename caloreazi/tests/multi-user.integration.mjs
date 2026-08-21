import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const dataDir = await mkdtemp(path.join(os.tmpdir(), "caloreazi-integration-"));
const port = 38000 + Math.floor(Math.random() * 2000);
const databaseUrl = process.env.CALOREAZI_TEST_DATABASE_URL || "";
const server = spawn(process.execPath, [path.resolve(import.meta.dirname, "..", "node_modules", "vinext", "dist", "cli.js"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: path.resolve(import.meta.dirname, ".."), env: { ...process.env, CALOREAZI_DATA_DIR: dataDir, CALOREAZI_DATABASE_URL: databaseUrl, CALOREAZI_ALLOW_FILE_STORE: databaseUrl ? "0" : "1" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
let output = ""; server.stdout.on("data", (chunk) => { output += chunk; }); server.stderr.on("data", (chunk) => { output += chunk; });
const base = `http://127.0.0.1:${port}`;

async function waitForServer() { for (let attempt = 0; attempt < 60; attempt += 1) { try { if ((await fetch(`${base}/health`)).ok) return; } catch { /* booting */ } await new Promise((resolve) => setTimeout(resolve, 250)); } throw new Error(`server did not start\n${output}`); }
function cookie(response) { return response.headers.get("set-cookie")?.split(";")[0] || ""; }
async function json(url, options = {}) { const response = await fetch(`${base}${url}`, options); const text = await response.text(); if (!text) throw new Error(`empty response from ${url} (${response.status})\n${output}`); try { return { response, body: JSON.parse(text) }; } catch { throw new Error(`invalid JSON from ${url} (${response.status}): ${text.slice(0, 500)}\n${output}`); } }

try {
  await waitForServer();
  const onboarded = await json("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ name: "Admin", email: "admin@example.test", adminPassword: "AdminPassword123!", goal: "maintain", sex: "male", age: 35, height: 180, weight: 80, targetWeight: 80, activity: "moderate" }) });
  assert.equal(onboarded.response.status, 200, JSON.stringify(onboarded.body)); const adminCookie = cookie(onboarded.response); assert.ok(adminCookie);
  const created = await json("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json", Cookie: adminCookie, Origin: base }, body: JSON.stringify({ name: "Member", email: "member@example.test", password: "MemberPassword123!" }) });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  const login = await json("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ login: "member@example.test", password: "MemberPassword123!" }) });
  assert.equal(login.response.status, 200, JSON.stringify(login.body)); const memberCookie = cookie(login.response); assert.ok(memberCookie);
  const memberMeal = await json("/api/meals", { method: "POST", headers: { "Content-Type": "application/json", Cookie: memberCookie, Origin: base }, body: JSON.stringify({ name: "Member meal", kcal: 250, protein: 20, carbs: 20, fat: 8, period: "lunch" }) });
  assert.equal(memberMeal.response.status, 200); const memberMealId = memberMeal.body.savedMealId;
  assert.ok(memberMealId, "meal API did not return the persisted id");
  const stateAfterMealSave = await json("/api/state", { headers: { Cookie: memberCookie } });
  const mealsAfterRoundTrip = [stateAfterMealSave.body.today, ...(stateAfterMealSave.body.history || [])].flatMap((day) => day?.meals || []);
  assert.equal(mealsAfterRoundTrip.some((meal) => meal.id === memberMealId), true, "meal disappeared after database round-trip");
  const editedMeal = await json("/api/meals", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: memberCookie, Origin: base }, body: JSON.stringify({ id: memberMealId, name: "Updated member meal", kcal: 310, protein: 24, carbs: 30, fat: 10, period: "dinner" }) });
  assert.equal(editedMeal.response.status, 200, JSON.stringify(editedMeal.body));
  const stateAfterEdit = await json("/api/state", { headers: { Cookie: memberCookie } });
  const updated = stateAfterEdit.body.today.meals.find((meal) => meal.id === memberMealId);
  assert.equal(updated.name, "Updated member meal");
  assert.equal(updated.kcal, 310, "edited calories did not reach the current day calculation");
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const historicMeal = await json("/api/meals", { method: "POST", headers: { "Content-Type": "application/json", Cookie: memberCookie, Origin: base }, body: JSON.stringify({ name: "Historic meal", kcal: 180, protein: 10, carbs: 25, fat: 4, period: "lunch", occurredAt: yesterday }) });
  assert.equal(historicMeal.response.status, 200, JSON.stringify(historicMeal.body));
  assert.notEqual(historicMeal.body.savedLocalDate, stateAfterEdit.body.today.date);
  const stateAfterHistoricSave = await json("/api/state", { headers: { Cookie: memberCookie } });
  assert.equal(stateAfterHistoricSave.body.history.some((day) => day.date === historicMeal.body.savedLocalDate && day.meals.some((meal) => meal.id === historicMeal.body.savedMealId)), true, "historic meal was not saved under its local day");
  const rejectedCoffee = await json("/api/meals", { method: "POST", headers: { "Content-Type": "application/json", Cookie: memberCookie, Origin: base }, body: JSON.stringify({ name: "קפה שגוי", source: "photo", items: [{ name: "קפה עם חלב", grams: 250, quantity: 1, kcalPer100: 549, proteinPer100: 8, carbsPer100: 55, fatPer100: 33 }] }) });
  assert.equal(rejectedCoffee.response.status, 422);
  assert.equal(rejectedCoffee.body.requiresConfirmation, true);
  const crossDelete = await json("/api/meals", { method: "DELETE", headers: { "Content-Type": "application/json", Cookie: adminCookie, Origin: base }, body: JSON.stringify({ id: memberMealId }) });
  assert.equal(crossDelete.response.status, 200);
  const memberState = await json("/api/state", { headers: { Cookie: memberCookie } });
  assert.equal(memberState.body.today.meals.some((meal) => meal.id === memberMealId), true, "another user deleted the member meal");
  const backup = await json("/api/admin/backups", { method: "POST", headers: { "Content-Type": "application/json", Cookie: adminCookie, Origin: base }, body: JSON.stringify({ type: "database" }) }); assert.equal(backup.response.status, 200, JSON.stringify(backup.body)); assert.equal(backup.body.backup.verified, true);
  const listedBackups = await json("/api/admin/backups", { headers: { Cookie: adminCookie } }); assert.equal(listedBackups.body.backups[0].verified, true); assert.equal(listedBackups.body.backups[0].type, "database");
  const restored = await json("/api/admin/backups", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: adminCookie, Origin: base }, body: JSON.stringify({ name: backup.body.backup.name }) }); assert.equal(restored.response.status, 200, JSON.stringify(restored.body)); assert.ok(restored.body.safetyBackup);
  const sessions = await json("/api/auth/session", { headers: { Cookie: memberCookie } }); assert.equal(sessions.response.status, 200); assert.equal(sessions.body.sessions.length, 1);
  const revoked = await json("/api/auth/session", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: memberCookie, Origin: base }, body: JSON.stringify({ all: true }) }); assert.equal(revoked.response.status, 200);
  const deniedAfterRevoke = await json("/api/state", { headers: { Cookie: memberCookie } }); assert.equal(deniedAfterRevoke.body.authenticated, false);
  console.log("multi-user integration: ownership and session revocation passed");
} finally {
  server.kill();
  await new Promise((resolve) => server.once("exit", resolve));
  const resolved = path.resolve(dataDir); if (resolved.startsWith(path.resolve(os.tmpdir()))) await rm(resolved, { recursive: true, force: true });
}
