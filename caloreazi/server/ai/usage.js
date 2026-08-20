export function estimateCost({ inputTokens = 0, outputTokens = 0, inputCostPerMillion = 0, outputCostPerMillion = 0 }) {
  const input = Math.max(0, Number(inputTokens) || 0);
  const output = Math.max(0, Number(outputTokens) || 0);
  return (input * Math.max(0, Number(inputCostPerMillion) || 0) + output * Math.max(0, Number(outputCostPerMillion) || 0)) / 1_000_000;
}

export function evaluateBudget({ spentUsd = 0, monthlyBudgetUsd = 0, softLimitPercent = 80, hardLimitEnabled = true }) {
  const spent = Math.max(0, Number(spentUsd) || 0);
  const budget = Math.max(0, Number(monthlyBudgetUsd) || 0);
  if (budget === 0) return { allowed: true, state: 'unlimited', percentUsed: 0 };
  const percentUsed = (spent / budget) * 100;
  if (hardLimitEnabled && percentUsed >= 100) return { allowed: false, state: 'hard_limit', percentUsed };
  if (percentUsed >= Math.min(100, Math.max(1, Number(softLimitPercent) || 80))) return { allowed: true, state: 'soft_limit', percentUsed };
  return { allowed: true, state: 'ok', percentUsed };
}

export function normalizeUsage(usage = {}) {
  const inputTokens = Number(usage.input_tokens ?? usage.promptTokenCount ?? 0) || 0;
  const outputTokens = Number(usage.output_tokens ?? usage.candidatesTokenCount ?? 0) || 0;
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}
