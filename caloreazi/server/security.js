const buckets = new Map();

export function clientAddress(request) {
  return String(request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "local").split(",")[0].trim().slice(0, 80);
}

export function checkRateLimit(key, { limit, windowMs }) {
  const now = Date.now(); const current = buckets.get(key);
  if (!current || current.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return null; }
  current.count += 1;
  if (current.count <= limit) return null;
  return Response.json({ error: "בוצעו יותר מדי ניסיונות. יש להמתין ולנסות שוב" }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))) } });
}

export function requireSameOrigin(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const expectedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  try { if (new URL(origin).host === expectedHost) return null; } catch { /* invalid origin */ }
  return Response.json({ error: "מקור הבקשה אינו מורשה" }, { status: 403 });
}
