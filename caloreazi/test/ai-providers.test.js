import assert from "node:assert/strict";
import test from "node:test";
import { generateOpenAiCoachReply } from "../server/ai/openai.js";
import { generateGeminiCoachReply } from "../server/ai/gemini.js";
import { aiRole, aiRoleCandidates } from "../server/ai/models.js";
import { generateFoodImage } from "../server/ai/images.js";

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

test("adapters send meal images in each provider's multimodal format", async () => {
  const original = globalThis.fetch; const bodies = [];
  globalThis.fetch = async (_url, options) => { bodies.push(JSON.parse(options.body)); return bodies.length === 1 ? new Response(JSON.stringify({ output_text: "{}", usage: {} })) : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }], usageMetadata: {} })); };
  try {
    const imageDataUrl = "data:image/jpeg;base64,YQ==";
    await generateOpenAiCoachReply({ apiKey: "test", model: "model", instructions: "test", input: "meal", imageDataUrl });
    await generateGeminiCoachReply({ apiKey: "test", model: "model", instructions: "test", input: "meal", imageDataUrl });
    assert.equal(bodies[0].input[0].content[1].type, "input_image");
    assert.equal(bodies[1].contents[0].parts[1].inlineData.mimeType, "image/jpeg");
  } finally { globalThis.fetch = original; }
});

test("AI roles select separate coach, vision and image models", () => {
  const ai = { provider: "openai", model: "gpt-5.6-terra", roles: { coach: { provider: "openai", model: "gpt-5.6-sol" }, vision: { provider: "openai", model: "gpt-5.6-luna" }, image: { provider: "openai", model: "gpt-image-1-mini" } } };
  assert.equal(aiRole(ai, "coach").model, "gpt-5.6-sol");
  assert.equal(aiRole(ai, "vision").model, "gpt-5.6-luna");
  assert.equal(aiRole(ai, "image").model, "gpt-image-1-mini");
});

test("AI roles expose a distinct fallback without duplicating the primary", () => {
  const ai = { provider: "openai", model: "gpt-5.6-terra", roles: { vision: { model: "gpt-5.6-terra", fallbackModel: "gpt-5.6-luna" } } };
  assert.deepEqual(aiRoleCandidates(ai, "vision").map((item) => item.model), ["gpt-5.6-terra", "gpt-5.6-luna"]);
});

test("Gemini image adapter uses generateContent and reads inline image data", async () => {
  const original = globalThis.fetch; let request;
  globalThis.fetch = async (url, options) => { request = { url, body: JSON.parse(options.body) }; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "YQ==" } }] } }] })); };
  try {
    const image = await generateFoodImage({ provider: "gemini", model: "gemini-3.1-flash-image", apiKey: "test", name: "mango" });
    assert.match(request.url, /gemini-3\.1-flash-image:generateContent$/);
    assert.deepEqual(request.body.generationConfig.responseModalities, ["IMAGE"]);
    assert.equal(image, "data:image/png;base64,YQ==");
  } finally { globalThis.fetch = original; }
});
