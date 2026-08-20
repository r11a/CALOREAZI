import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateCost, evaluateBudget, normalizeUsage } from '../server/ai/usage.js';

test('estimates cost from configurable provider rates', () => {
  assert.equal(estimateCost({ inputTokens: 2_000_000, outputTokens: 500_000, inputCostPerMillion: 1, outputCostPerMillion: 4 }), 4);
});

test('applies soft and hard monthly budget states', () => {
  assert.equal(evaluateBudget({ spentUsd: 8, monthlyBudgetUsd: 10 }).state, 'soft_limit');
  assert.equal(evaluateBudget({ spentUsd: 10, monthlyBudgetUsd: 10 }).allowed, false);
  assert.equal(evaluateBudget({ spentUsd: 99, monthlyBudgetUsd: 0 }).state, 'unlimited');
});

test('normalizes OpenAI and Gemini token usage shapes', () => {
  assert.deepEqual(normalizeUsage({ input_tokens: 12, output_tokens: 5 }), { inputTokens: 12, outputTokens: 5, totalTokens: 17 });
  assert.deepEqual(normalizeUsage({ promptTokenCount: 8, candidatesTokenCount: 3 }), { inputTokens: 8, outputTokens: 3, totalTokens: 11 });
});
