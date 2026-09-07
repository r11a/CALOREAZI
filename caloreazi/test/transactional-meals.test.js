import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { insertDatabaseMeal } from "../server/state-database.js";

test("invalid analysis identifiers are rejected before database execution", async () => {
  const previous = process.env.CALOREAZI_DATABASE_URL;
  process.env.CALOREAZI_DATABASE_URL = "postgresql://unused";
  try {
    await assert.rejects(insertDatabaseMeal({
      userId: "11111111-1111-4111-8111-111111111111",
      meal: { id: "22222222-2222-4222-8222-222222222222" },
      analysisJobId: "'; SELECT 1; --",
    }), /Invalid meal or analysis identifier/);
  } finally { if (previous === undefined) delete process.env.CALOREAZI_DATABASE_URL; else process.env.CALOREAZI_DATABASE_URL = previous; }
});

test("meal creation uses a dedicated transaction and database idempotency key", async () => {
  const [route, database, migration] = await Promise.all([
    readFile(new URL("../app/api/meals/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/state-database.js", import.meta.url), "utf8"),
    readFile(new URL("../migrations/004_transactional_meal_writes.sql", import.meta.url), "utf8"),
  ]);
  assert.match(route, /insertDatabaseMeal/);
  assert.match(route, /clientRequestId/);
  assert.match(database, /pg_advisory_xact_lock/);
  assert.match(database, /INSERT INTO meals/);
  assert.match(migration, /UNIQUE INDEX[\s\S]*user_id, client_request_id/);
});
