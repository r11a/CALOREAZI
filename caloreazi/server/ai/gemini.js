import { normalizeUsage } from "./usage.js";
import { requestAi } from "./http.js";

export async function generateGeminiCoachReply({ apiKey, model, instructions, input, imageDataUrl, signal }) {
  if (!apiKey || !model) throw new Error("Gemini API key and model are required");
  const { response, payload } = await requestAi(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: instructions }] }, contents: [{ role: "user", parts: [{ text: input }, ...(imageDataUrl ? [{ inlineData: { mimeType: imageDataUrl.slice(5, imageDataUrl.indexOf(";")), data: imageDataUrl.split(",")[1] } }] : [])] }], generationConfig: { maxOutputTokens: 1200, thinkingConfig: { thinkingLevel: "low" } } }),
    signal,
  }, { provider: "Gemini" });
  const text = (payload.candidates?.[0]?.content?.parts || []).filter((part) => !part.thought).map((part) => part.text || "").join("").trim();
  return { text, usage: normalizeUsage(payload.usageMetadata), requestId: response.headers.get("x-request-id") || null };
}
