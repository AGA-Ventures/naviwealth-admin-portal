import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const datasets = sqliteTable("datasets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["event", "stock"] }).notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["draft", "ready", "archived"] })
    .notNull()
    .default("draft"),
  memberIds: text("member_ids").notNull().default("[]"),
  itemCount: integer("item_count").notNull().default(0),
  reuseCount: integer("reuse_count").notNull().default(0),
  validationState: text("validation_state", {
    enum: ["valid", "warning"],
  })
    .notNull()
    .default("valid"),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
