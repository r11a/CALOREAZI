function finite(value) { const number = Number(value); return Number.isFinite(number) ? number : 0; }

export function evaluateMealBenchmark(cases) {
  const rows = (Array.isArray(cases) ? cases : []).filter((item) => item?.expected && item?.actual).map((item) => {
    const expectedKcal = Math.max(1, finite(item.expected.kcal));
    const actualKcal = Math.max(0, finite(item.actual.kcal));
    const expectedNames = new Set((item.expected.items || []).map((value) => String(value).trim().toLocaleLowerCase()).filter(Boolean));
    const actualNames = new Set((item.actual.items || []).map((value) => String(value).trim().toLocaleLowerCase()).filter(Boolean));
    const matched = [...expectedNames].filter((name) => actualNames.has(name)).length;
    return { id: String(item.id || ""), calorieErrorPercent: Math.abs(actualKcal - expectedKcal) / expectedKcal * 100, itemRecallPercent: expectedNames.size ? matched / expectedNames.size * 100 : 100, latencyMs: Math.max(0, finite(item.actual.latencyMs)), requiredCorrection: Boolean(item.actual.requiredCorrection) };
  });
  const sortedErrors = rows.map((row) => row.calorieErrorPercent).sort((a, b) => a - b);
  const percentile = (values, ratio) => values.length ? values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)] : 0;
  const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return {
    cases: rows.length,
    medianCalorieErrorPercent: percentile(sortedErrors, .5),
    p95CalorieErrorPercent: percentile(sortedErrors, .95),
    averageItemRecallPercent: average(rows.map((row) => row.itemRecallPercent)),
    p50LatencyMs: percentile(rows.map((row) => row.latencyMs).sort((a, b) => a - b), .5),
    p95LatencyMs: percentile(rows.map((row) => row.latencyMs).sort((a, b) => a - b), .95),
    correctionRatePercent: average(rows.map((row) => row.requiredCorrection ? 100 : 0)),
    rows,
  };
}
