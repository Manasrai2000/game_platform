import {
  mysqlTable,
  bigint,
  varchar,
  json,
  datetime,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const auth_audit_logs = mysqlTable(
  "auth_audit_logs",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    actor_user_id: bigint("actor_user_id", { mode: "number", unsigned: true }),
    target_user_id: bigint("target_user_id", { mode: "number", unsigned: true }),
    event_type: varchar("event_type", { length: 64 }).notNull(),
    ip_address: varchar("ip_address", { length: 45 }).notNull(),
    metadata_json: json("metadata_json"),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("idx_audit_target_time").on(table.target_user_id, table.created_at),
    index("idx_audit_event_time").on(table.event_type, table.created_at),
  ]
);

export type AuthAuditLog = typeof auth_audit_logs.$inferSelect;
export type NewAuthAuditLog = typeof auth_audit_logs.$inferInsert;
