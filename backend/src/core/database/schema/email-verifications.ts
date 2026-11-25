import {
  mysqlTable,
  bigint,
  varchar,
  boolean,
  datetime,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const emailVerifications = mysqlTable(
  "email_verifications",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    otp_code: varchar("otp_code", { length: 10 }).notNull(),
    expires_at: datetime("expires_at", { fsp: 3 }).notNull(),
    is_verified: boolean("is_verified").notNull().default(false),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("idx_email_verif_email").on(table.email),
    index("idx_email_verif_expires").on(table.expires_at),
  ]
);

export type EmailVerification = typeof emailVerifications.$inferSelect;
export type NewEmailVerification = typeof emailVerifications.$inferInsert;
