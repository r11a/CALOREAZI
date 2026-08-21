import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../../.github/workflows/foundation.yml", import.meta.url), "utf8");

test("release CI verifies an empty Home Assistant data volume and restart", () => {
  assert.match(workflow, /Boot Home Assistant image and verify runtime/);
  assert.match(workflow, /caloreazi-cold-data:\/data/);
  assert.match(workflow, /127\.0\.0\.1:18686\/health/);
  assert.match(workflow, /docker restart caloreazi-runtime/);
});

test("release CI enforces type, integration and production dependency gates", () => {
  assert.match(workflow, /npm run verify/);
  assert.match(workflow, /npm run test:integration/);
  assert.match(workflow, /npm audit --omit=dev/);
});

test("Home Assistant downloads a complete frontend asset after boot and restart", () => {
  assert.match(workflow, /caloreazi-static-asset-after-restart/);
});
