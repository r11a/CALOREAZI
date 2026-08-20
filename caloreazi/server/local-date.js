export const DEFAULT_TIME_ZONE = process.env.TZ || "Asia/Jerusalem";

export function localDateAt(value = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function validTimeZone(value) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: String(value) }).format();
    return String(value);
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

export function userTimeZone(data) {
  return validTimeZone(data?.profile?.timeZone || DEFAULT_TIME_ZONE);
}
