import {
  mysqlTable,
  bigint,
  varchar,
  mysqlEnum,
  boolean,
  datetime,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable(
  "users",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    password_hash: varchar("password_hash", { length: 255 }).notNull(),
    raw_password: varchar("raw_password", { length: 255 }),
    full_name: varchar("full_name", { length: 150 }).notNull(),
    mobile_number: varchar("mobile_number", { length: 20 }).notNull(),
    class_grade: varchar("class_grade", { length: 50 }).notNull(),
    school_name: varchar("school_name", { length: 200 }).notNull(),
    city: varchar("city", { length: 100 }).notNull().default(""),
    state: varchar("state", { length: 100 }).notNull().default(""),
    role: mysqlEnum("role", ["STUDENT", "ADMIN"]).notNull().default("STUDENT"),
    is_active: boolean("is_active").notNull().default(true),
    email_verified_at: datetime("email_verified_at", { fsp: 3 }),
    mfa_secret_enc: varchar("mfa_secret_enc", { length: 255 }),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updated_at: datetime("updated_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("uq_users_email").on(table.email),
    index("idx_users_mobile").on(table.mobile_number),
    index("idx_users_role_active").on(table.role, table.is_active),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
