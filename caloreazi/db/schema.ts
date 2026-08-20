import { bigint, boolean, date, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").unique(), email: text("email"), displayName: text("display_name").notNull(),
  passwordHash: text("password_hash"), role: text("role").notNull().default("member"), active: boolean("active").notNull().default(true),
  sessionVersion: integer("session_version").notNull().default(1), lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyRecords = pgTable("daily_records", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  localDate: date("local_date").notNull(), timezone: text("timezone").notNull().default("Asia/Jerusalem"), waterMl: integer("water_ml").notNull().default(0), dailyScore: integer("daily_score"),
});

export const meals = pgTable("meals", {
  id: uuid("id").primaryKey(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), dailyRecordId: bigint("daily_record_id", { mode: "number" }).references(() => dailyRecords.id),
  name: text("name").notNull(), period: text("period").notNull(), source: text("source").notNull(), occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  kcal: numeric("kcal", { precision: 10, scale: 2 }).notNull(), proteinG: numeric("protein_g", { precision: 10, scale: 2 }).notNull(), carbsG: numeric("carbs_g", { precision: 10, scale: 2 }).notNull(), fatG: numeric("fat_g", { precision: 10, scale: 2 }).notNull(), deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const analysisJobs = pgTable("analysis_jobs", {
  id: uuid("id").primaryKey(), clientId: text("client_id").notNull(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), status: text("status").notNull(), attemptCount: integer("attempt_count").notNull().default(0), result: jsonb("result"), errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
