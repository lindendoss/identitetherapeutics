import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  unionId: text("unionId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  lastSignInAt: integer("lastSignInAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Vault users — password-protected document vault
export const vaultUsers = sqliteTable("vault_users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: text("role", { enum: ["viewer", "admin"] }).default("viewer").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type VaultUser = typeof vaultUsers.$inferSelect;

// Vault files — metadata for uploaded documents
export const vaultFiles = sqliteTable("vault_files", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"),
  uploadedBy: integer("uploaded_by"),
  category: text("category"),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type VaultFile = typeof vaultFiles.$inferSelect;
