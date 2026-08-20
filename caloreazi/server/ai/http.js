export class AiRequestError extends Error {
  constructor(message, status = 502, retryable = false) { super(message); this.status = status; this.retryable = retryable; }
}

function friendlyError(provider, status, payload) {
  const detail = String(payload?.error?.message || payload?.message || "");
  if (status === 401 || status === 403) return new AiRequestError(`מפתח ה־API של ${provider} נדחה. יש לבדוק אותו בהגדרות המנהל.`, 401);
  if (status === 404) return new AiRequestError(`המודל שנבחר אינו זמין לחשבון ${provider}. יש לבחור מודל אחר בהגדרות.`, 409);
  if (status === 429) return new AiRequestError(`שירות ${provider} עמוס או שמכסת ה־API הסתיימה. נסה שוב בעוד רגע.`, 429, true);
  if ([500, 502, 503, 504].includes(status)) return new AiRequestError(`שירות ${provider} לא השיב באופן תקין. נסה שוב בעוד רגע.`, 503, true);
  return new AiRequestError(detail || `הבקשה אל ${provider} נכשלה.`, 502);
}

export async function requestAi(url, options, { provider, timeoutMs = 45_000 } = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: options.signal || controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) return { response, payload };
      const error = friendlyError(provider, response.status, payload);
      if (error.retryable && attempt === 0) { await new Promise((resolve) => setTimeout(resolve, 700)); continue; }
      throw error;
    } catch (error) {
      if (error?.name === "AbortError") throw new AiRequestError(`התגובה מ־${provider} ארכה יותר מדי. נסה שוב או בחר מודל מהיר יותר.`, 504, true);
      if (error instanceof AiRequestError) throw error;
      if (attempt === 0) { await new Promise((resolve) => setTimeout(resolve, 700)); continue; }
      throw new AiRequestError(`לא ניתן להתחבר כרגע אל ${provider}.`, 503, true);
    } finally { clearTimeout(timer); }
  }
}

export function aiErrorStatus(error) { return Number(error?.status) || 502; }
