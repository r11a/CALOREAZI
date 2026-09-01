export const AI_MODELS = {
  openai: [
    { id: "gpt-5.6-terra", label: "GPT-5.6 Terra", description: "המלצת עלות־תועלת: דיוק גבוה לניתוח ארוחות, תמונות ושיחה.", inputCost: 2, outputCost: 12, vision: true, recommended: true },
    { id: "gpt-5.6-luna", label: "GPT-5.6 Luna", description: "האפשרות החסכונית לנפח גבוה; מהירה וזולה יותר, עם פחות עומק.", inputCost: 0.2, outputCost: 1.2, vision: true },
    { id: "gpt-5.6-sol", label: "GPT-5.6 Sol", description: "המודל החזק ביותר; מתאים כשדיוק מרבי חשוב יותר מהעלות.", inputCost: 5, outputCost: 30, vision: true },
  ],
  gemini: [
    { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", description: "המלצת עלות־תועלת של Gemini: מודל Flash יציב ועדכני עם ראייה.", inputCost: 0.75, outputCost: 3.75, vision: true, recommended: true },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", description: "מצב חסכוני: מתאים לשיחה ולמשימות תזונה פשוטות בנפח גבוה.", inputCost: 0.25, outputCost: 1.5, vision: true },
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", description: "האפשרות הזולה והמהירה ביותר למשימות פשוטות ובנפח גבוה.", inputCost: 0.3, outputCost: 2.5, vision: true },
    { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", description: "דור Flash קודם, מולטימודלי ויציב; נשמר לתאימות.", inputCost: 0.75, outputCost: 3.75, vision: true },
  ],
};

export const IMAGE_MODELS = {
  openai: [
    { id: "gpt-image-1-mini", label: "GPT Image 1 Mini", description: "יצירת תמונות חסכונית ומהירה לקטלוג מזון.", recommended: true },
    { id: "gpt-image-1", label: "GPT Image 1", description: "איכות תמונה גבוהה יותר בעלות גבוהה יותר." },
  ],
  gemini: [
    { id: "gemini-3.1-flash-lite-image", label: "Gemini 3.1 Flash-Lite Image", description: "יצירת תמונות חסכונית יותר; מופעלת רק בבקשה מפורשת." },
    { id: "gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image", description: "מודל תמונה מהיר ליצירת תמונות מזון.", recommended: true },
  ],
};

export function modelsFor(provider) { return AI_MODELS[provider === "gemini" ? "gemini" : "openai"]; }
export function findModel(provider, id) { return modelsFor(provider).find((model) => model.id === id); }
export function recommendedModel(provider) { return modelsFor(provider).find((model) => model.recommended) || modelsFor(provider)[0]; }
export function imageModelsFor(provider) { return IMAGE_MODELS[provider === "gemini" ? "gemini" : "openai"]; }
export function findImageModel(provider, id) { return imageModelsFor(provider).find((model) => model.id === id); }
export function aiRole(ai, role) { const fallback = { provider: ai.provider, model: ai.model }; const configured = ai.roles?.[role] || {}; return { provider: configured.provider || fallback.provider, model: configured.model || (role === "image" ? imageModelsFor(configured.provider || fallback.provider)[0].id : fallback.model), fallbackModel: configured.fallbackModel || "" }; }
export function aiRoleCandidates(ai, role) { const selected = aiRole(ai, role); return [selected.model, selected.fallbackModel].filter((model, index, values) => model && values.indexOf(model) === index).map((model) => ({ provider: selected.provider, model })); }
