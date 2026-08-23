import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMealBenchmark } from "../server/meal-benchmark.js";

test("meal benchmark measures accuracy, recall, corrections and latency", () => {
  const report = evaluateMealBenchmark([
    { id: "coffee", expected: { kcal: 90, items: ["coffee", "milk"] }, actual: { kcal: 100, items: ["coffee", "milk"], latencyMs: 4000, requiredCorrection: false } },
    { id: "salad", expected: { kcal: 400, items: ["chicken", "tomato"] }, actual: { kcal: 500, items: ["chicken"], latencyMs: 9000, requiredCorrection: true } },
  ]);
  assert.equal(report.cases, 2);
  assert.equal(report.averageItemRecallPercent, 75);
  assert.equal(report.correctionRatePercent, 50);
  assert.equal(report.p95LatencyMs, 9000);
  assert.ok(report.medianCalorieErrorPercent > 10);
});
