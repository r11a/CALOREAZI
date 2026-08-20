export const AI_MODELS = {
  openai: [
    { id: "gpt-5.6-terra", label: "GPT-5.6 Terra", description: "המלצת עלות־תועלת: דיוק גבוה לניתוח ארוחות, תמונות ושיחה.", inputCost: 2, outputCost: 12, vision: true, recommended: true },
    { id: "gpt-5.6-luna", label: "GPT-5.6 Luna", description: "האפשרות החסכונית לנפח גבוה; מהירה וזולה יותר, עם פחות עומק.", inputCost: 0.2, outputCost: 1.2, vision: true },
    { id: "gpt-5.6-sol", label: "GPT-5.6 Sol", description: "המודל החזק ביותר; מתאים כשדיוק מרבי חשוב יותר מהעלות.", inputCost: 5, outputCost: 30, vision: true },
  ],
  gemini: [
    { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", description: "המלצת עלות־תועלת של Gemini: מודל Flash יציב ועדכני עם ראייה.", inputCost: 0.75, outputCost: 3.75, vision: true, recommended: true },
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", description: "האפשרות הזולה והמהירה ביותר למשימות פשוטות ובנפח גבוה.", inputCost: 0.3, outputCost: 2.5, vision: true },
    { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", description: "דור Flash קודם, מולטימודלי ויציב; נשמר לתאימות.", inputCost: 0.75, outputCost: 3.75, vision: true },
  ],
};

export function modelsFor(provider) { return AI_MODELS[provider === "gemini" ? "gemini" : "openai"]; }
export function findModel(provider, id) { return modelsFor(provider).find((model) => model.id === id); }
export function recommendedModel(provider) { return modelsFor(provider).find((model) => model.recommended) || modelsFor(provider)[0]; }
