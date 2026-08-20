import assert from "node:assert/strict";
import test from "node:test";
import { generateOpenAiCoachReply } from "../server/ai/openai.js";
import { generateGeminiCoachReply } from "../server/ai/gemini.js";

test("OpenAI adapter returns text and normalized token usage", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text: "תגובה", usage: { input_tokens: 12, output_tokens: 7 } }), { status: 200, headers: { "x-request-id": "req_1" } });
  try {
    const result = await generateOpenAiCoachReply({ apiKey: "test", model: "test-model", instructions: "test", input: "test" });
    assert.equal(result.text, "תגובה"); assert.deepEqual(result.usage, { inputTokens: 12, outputTokens: 7, totalTokens: 19 });
  } finally { globalThis.fetch = original; }
});

test("Gemini adapter returns text and normalized token usage", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "תקין" }] } }], usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 4 } }), { status: 200 });
  try {
    const result = await generateGeminiCoachReply({ apiKey: "test", model: "test-model", instructions: "test", input: "test" });
    assert.equal(result.text, "תקין"); assert.deepEqual(result.usage, { inputTokens: 9, outputTokens: 4, totalTokens: 13 });
  } finally { globalThis.fetch = original; }
});
