import {
  mysqlTable,
  bigint,
  varchar,
  int,
  boolean,
  datetime,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const classes = mysqlTable(
  "classes",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    display_order: int("display_order").notNull().default(0),
    is_active: boolean("is_active").notNull().default(true),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updated_at: datetime("updated_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("idx_classes_order").on(table.display_order),
    index("idx_classes_active").on(table.is_active),
  ]
);

export type ClassModel = typeof classes.$inferSelect;
export type NewClassModel = typeof classes.$inferInsert;
