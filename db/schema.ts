import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const studyNotes = sqliteTable("study_notes", {
  id: integer("id").notNull(),
  ownerKey: text("owner_key").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  category: text("category").notNull().default("FIT2004"),
  updatedAt: text("updated_at").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  uniqueIndex("study_notes_owner_id").on(table.ownerKey, table.id),
]);
