// The Home Assistant runtime uses the migration runner and database-backed
// repositories in server/. This module intentionally exposes configuration
// only; it no longer pretends that a Cloudflare D1 binding is the product DB.
export function databaseUrl() {
  const value = process.env.CALOREAZI_DATABASE_URL;
  if (!value) throw new Error("CALOREAZI_DATABASE_URL is required");
  return value;
}
