import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.CALOREAZI_DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/caloreazi" },
});
