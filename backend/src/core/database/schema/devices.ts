import {
  mysqlTable,
  bigint,
  varchar,
  text,
  mysqlEnum,
  tinyint,
  datetime,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const user_devices = mysqlTable(
  "user_devices",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    user_id: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    device_token_hash: varchar("device_token_hash", { length: 64 }).notNull(),
    public_key_spki: text("public_key_spki"),
    dbsc_session_id: varchar("dbsc_session_id", { length: 128 }),
    device_label: varchar("device_label", { length: 200 }).notNull(),
    status: mysqlEnum("status", ["ACTIVE", "REVOKED"]).notNull().default("ACTIVE"),
    active_slot: tinyint("active_slot").generatedAlwaysAs(
      (): ReturnType<typeof sql> => sql`IF(${user_devices.status} = 'ACTIVE', 1, NULL)`
    ),
    bound_ip: varchar("bound_ip", { length: 45 }).notNull(),
    last_seen_at: datetime("last_seen_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    revoked_at: datetime("revoked_at", { fsp: 3 }),
    revoked_by_admin_id: bigint("revoked_by_admin_id", {
      mode: "number",
      unsigned: true,
    }).references(() => users.id, { onDelete: "set null" }),
    revoke_reason: varchar("revoke_reason", { length: 255 }),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("uq_user_one_active_device").on(table.user_id, table.active_slot),
    uniqueIndex("uq_device_token_hash").on(table.device_token_hash),
    index("idx_devices_user_status").on(table.user_id, table.status),
  ]
);

export type UserDevice = typeof user_devices.$inferSelect;
export type NewUserDevice = typeof user_devices.$inferInsert;
