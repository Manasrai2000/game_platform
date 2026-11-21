import {
  mysqlTable,
  char,
  bigint,
  varchar,
  datetime,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { user_devices } from "./devices";

export const sessions = mysqlTable(
  "sessions",
  {
    id: char("id", { length: 36 }).primaryKey(), // UUIDv7
    user_id: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    device_id: bigint("device_id", { mode: "number", unsigned: true })
      .references(() => user_devices.id, { onDelete: "cascade" }), // NULL for Admins
    session_token_hash: varchar("session_token_hash", { length: 64 }).notNull(),
    ip_address: varchar("ip_address", { length: 45 }).notNull(),
    user_agent: varchar("user_agent", { length: 512 }).notNull(),
    expires_at: datetime("expires_at", { fsp: 3 }).notNull(),
    revoked_at: datetime("revoked_at", { fsp: 3 }),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("uq_session_token_hash").on(table.session_token_hash),
    index("idx_sessions_user_active").on(
      table.user_id,
      table.revoked_at,
      table.expires_at
    ),
  ]
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
