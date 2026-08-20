export async function transcribeMealAudio({ provider, apiKey, model, audioDataUrl }) {
  const match = String(audioDataUrl || "").match(/^data:(audio\/[^;,]+)(?:;[^,]*)?;base64,(.+)$/);
  if (!match) throw new Error("פורמט ההקלטה אינו נתמך");
  const [, mimeType, encoded] = match;
  if (provider === "gemini") {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "תמלל את ההקלטה בדיוק לעברית. החזר רק את התמלול, ללא הסבר." }, { inlineData: { mimeType, data: encoded } }] }], generationConfig: { maxOutputTokens: 500 } }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || "תמלול Gemini נכשל");
    return (payload.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("").trim();
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length < 800) throw new Error("ההקלטה ריקה או קצרה מדי");
  const extension = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : mimeType.includes("mpeg") ? "mp3" : "wav";
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), `meal.${extension}`);
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("language", "he");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "תמלול OpenAI נכשל");
  return String(payload.text || "").trim();
}
