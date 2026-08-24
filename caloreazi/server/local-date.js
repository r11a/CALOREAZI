export const DEFAULT_TIME_ZONE = process.env.TZ || "Asia/Jerusalem";

/** @param {Date|string|number} value */
export function localDateAt(value = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
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

/** @param {any} data @param {Date|string|number} value */
export function entryDateFor(data, value = new Date()) {
  const actualDate = localDateAt(value, userTimeZone(data));
  if (data?.profile?.dayBoundaryMode !== "manual" || !data?.today?.date) return actualDate;
  return data.today.date;
}
