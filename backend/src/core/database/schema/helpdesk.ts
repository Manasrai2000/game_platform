import {
  mysqlTable,
  bigint,
  varchar,
  boolean,
  datetime,
  text,
  mysqlEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/**
 * Support / Helpdesk Tickets (Both Registered Students & Non-Registered Guests)
 */
export const support_tickets = mysqlTable(
  "support_tickets",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    ticket_number: varchar("ticket_number", { length: 32 }).notNull(),
    user_id: bigint("user_id", { mode: "number", unsigned: true })
      .references(() => users.id, { onDelete: "set null" }),
    is_registered_user: boolean("is_registered_user").notNull().default(false),
    requester_name: varchar("requester_name", { length: 150 }).notNull(),
    requester_email: varchar("requester_email", { length: 255 }).notNull(),
    requester_mobile: varchar("requester_mobile", { length: 20 }),
    category: mysqlEnum("category", [
      "LOGIN_DEVICE_LOCK",
      "REGISTRATION_OTP",
      "PASSWORD_RESET",
      "PAYMENT_SUBSCRIPTION",
      "ACTIVITY_BUG",
      "OTHER",
    ])
      .notNull()
      .default("OTHER"),
    subject: varchar("subject", { length: 255 }).notNull(),
    description: text("description").notNull(),
    status: mysqlEnum("status", ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
      .notNull()
      .default("OPEN"),
    priority: mysqlEnum("priority", ["LOW", "MEDIUM", "HIGH", "URGENT"])
      .notNull()
      .default("MEDIUM"),
    admin_reply: text("admin_reply"),
    resolved_by_admin_id: bigint("resolved_by_admin_id", { mode: "number", unsigned: true })
      .references(() => users.id, { onDelete: "set null" }),
    resolved_at: datetime("resolved_at", { fsp: 3 }),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updated_at: datetime("updated_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("uq_support_ticket_number").on(table.ticket_number),
    index("idx_support_status_created").on(table.status, table.created_at),
    index("idx_support_email").on(table.requester_email),
  ]
);

export type SupportTicketModel = typeof support_tickets.$inferSelect;
export type NewSupportTicketModel = typeof support_tickets.$inferInsert;
