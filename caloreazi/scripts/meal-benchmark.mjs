import { readFile } from "node:fs/promises";
import { evaluateMealBenchmark } from "../server/meal-benchmark.js";

const file = process.argv[2];
if (!file) { console.error("Usage: npm run benchmark:meals -- path/to/results.json"); process.exit(2); }
const report = evaluateMealBenchmark(JSON.parse(await readFile(file, "utf8")));
console.log(JSON.stringify(report, null, 2));
if (!report.cases) process.exitCode = 2;
else if (report.medianCalorieErrorPercent > 15 || report.averageItemRecallPercent < 90 || report.p95LatencyMs > 12_000) process.exitCode = 1;
