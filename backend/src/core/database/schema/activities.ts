import {
  mysqlTable,
  bigint,
  varchar,
  int,
  boolean,
  datetime,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { classes } from "./classes";

/**
 * Class Game Package (One main Journey per class linking all activities)
 */
export const class_activities = mysqlTable(
  "class_activities",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    class_id: bigint("class_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    version: int("version").notNull().default(1),
    storage_path: varchar("storage_path", { length: 255 }).notNull(),
    entry_file: varchar("entry_file", { length: 255 }).notNull().default("index.html"),
    total_checkpoints: int("total_checkpoints").notNull().default(3),
    is_active: boolean("is_active").notNull().default(true),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updated_at: datetime("updated_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("uq_class_activity_package").on(table.class_id),
    index("idx_class_activity_active").on(table.is_active),
  ]
);

/**
 * Student Journey Progress (Tracks where student left off & prevents replaying completed activities)
 */
export const student_journey_progress = mysqlTable(
  "student_journey_progress",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    user_id: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    class_id: bigint("class_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    activity_id: bigint("activity_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => class_activities.id, { onDelete: "cascade" }),
    current_checkpoint: int("current_checkpoint").notNull().default(1),
    max_completed_checkpoint: int("max_completed_checkpoint").notNull().default(0),
    journey_state: text("journey_state"),
    is_journey_completed: boolean("is_journey_completed").notNull().default(false),
    last_played_at: datetime("last_played_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updated_at: datetime("updated_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("uq_student_class_journey").on(table.user_id, table.class_id),
    index("idx_student_journey_user").on(table.user_id),
  ]
);

export type ClassActivityModel = typeof class_activities.$inferSelect;
export type NewClassActivityModel = typeof class_activities.$inferInsert;

export type StudentJourneyProgressModel = typeof student_journey_progress.$inferSelect;
export type NewStudentJourneyProgressModel = typeof student_journey_progress.$inferInsert;
