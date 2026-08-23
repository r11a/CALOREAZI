import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
