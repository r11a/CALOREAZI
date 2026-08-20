export async function generateFoodImage({ provider, model, apiKey, name }) {
  const prompt = `Premium appetizing food catalog illustration of ${name}, single dish centered, warm natural light, clean neutral background, no text, no logo, square composition`;
  if (provider === "gemini") {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", { method: "POST", headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ model: model || "gemini-3.1-flash-image", input: prompt, response_format: { type: "image", aspect_ratio: "1:1", image_size: "1K" } }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || "יצירת התמונה ב-Gemini נכשלה");
    const image = payload.output_image || payload.outputs?.find((item) => item.type === "image")?.image;
    if (!image?.data) throw new Error("Gemini לא החזיר תמונה");
    return `data:${image.mime_type || "image/png"};base64,${image.data}`;
  }
  const response = await fetch("https://api.openai.com/v1/images/generations", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: model || "gpt-image-1-mini", prompt, size: "1024x1024", quality: "low", output_format: "webp" }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "יצירת התמונה ב-OpenAI נכשלה");
  if (!payload.data?.[0]?.b64_json) throw new Error("OpenAI לא החזיר תמונה");
  return `data:image/webp;base64,${payload.data[0].b64_json}`;
}
