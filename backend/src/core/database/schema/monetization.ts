import {
  mysqlTable,
  bigint,
  varchar,
  int,
  boolean,
  datetime,
  text,
  mysqlEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { classes } from "./classes";

/**
 * Subscription Plans (e.g., Annual Class Pass, Term Pass)
 */
export const plans = mysqlTable(
  "plans",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    class_id: bigint("class_id", { mode: "number", unsigned: true })
      .references(() => classes.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 50 }).notNull(),
    title: varchar("title", { length: 150 }).notNull(),
    description: text("description"),
    price_inr: int("price_inr").notNull(),
    duration_days: int("duration_days").notNull(),
    badge: varchar("badge", { length: 50 }),
    is_active: boolean("is_active").notNull().default(true),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updated_at: datetime("updated_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("uq_plan_code").on(table.code),
    index("idx_plans_class_active").on(table.class_id, table.is_active),
  ]
);

/**
 * Payment Orders (Created before checkout and updated upon payment verification)
 */
export const orders = mysqlTable(
  "orders",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    user_id: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan_id: bigint("plan_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    base_amount: int("base_amount").notNull(),
    discount_amount: int("discount_amount").notNull().default(0),
    wallet_discount_used: int("wallet_discount_used").notNull().default(0),
    final_amount: int("final_amount").notNull(),
    referral_code_used: varchar("referral_code_used", { length: 32 }),
    status: mysqlEnum("status", ["PENDING", "PAID", "FAILED"])
      .notNull()
      .default("PENDING"),
    gateway: varchar("gateway", { length: 32 }).notNull().default("RAZORPAY"),
    gateway_order_id: varchar("gateway_order_id", { length: 100 }).notNull(),
    gateway_payment_id: varchar("gateway_payment_id", { length: 100 }),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updated_at: datetime("updated_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("uq_gateway_order_id").on(table.gateway_order_id),
    index("idx_orders_user").on(table.user_id),
  ]
);

/**
 * Active Student Subscriptions
 */
export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    user_id: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan_id: bigint("plan_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    order_id: bigint("order_id", { mode: "number", unsigned: true })
      .references(() => orders.id, { onDelete: "set null" }),
    status: mysqlEnum("status", ["ACTIVE", "EXPIRED", "CANCELLED"])
      .notNull()
      .default("ACTIVE"),
    starts_at: datetime("starts_at", { fsp: 3 }).notNull(),
    expires_at: datetime("expires_at", { fsp: 3 }).notNull(),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updated_at: datetime("updated_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("idx_subscriptions_user_status").on(table.user_id, table.status),
  ]
);

/**
 * Referral Attributions & Rewards
 */
export const referrals = mysqlTable(
  "referrals",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    referrer_id: bigint("referrer_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referee_id: bigint("referee_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referral_code: varchar("referral_code", { length: 32 }).notNull(),
    discount_given: int("discount_given").notNull().default(0),
    reward_credited: int("reward_credited").notNull().default(0),
    status: mysqlEnum("status", ["REGISTERED", "APPLIED", "REWARDED"])
      .notNull()
      .default("REGISTERED"),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updated_at: datetime("updated_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("uq_referral_referee").on(table.referee_id),
    index("idx_referrals_referrer").on(table.referrer_id),
  ]
);

/**
 * Granular Activity & Funnel Tracking Events
 */
export const activity_tracking_events = mysqlTable(
  "activity_tracking_events",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    user_id: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    class_id: bigint("class_id", { mode: "number", unsigned: true })
      .references(() => classes.id, { onDelete: "set null" }),
    event_type: varchar("event_type", { length: 64 }).notNull(),
    event_metadata: text("event_metadata"),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("idx_tracking_user_type").on(table.user_id, table.event_type),
  ]
);

/**
 * Admin-Generated Promo / Referral Codes with Expiration Period
 */
export const promo_referral_codes = mysqlTable(
  "promo_referral_codes",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    label: varchar("label", { length: 150 }).notNull().default("Admin Referral"),
    discount_percent: int("discount_percent").notNull().default(10),
    discount_flat_inr: int("discount_flat_inr").notNull().default(0),
    max_uses: int("max_uses"),
    used_count: int("used_count").notNull().default(0),
    expires_at: datetime("expires_at", { fsp: 3 }).notNull(),
    is_active: boolean("is_active").notNull().default(true),
    created_by_admin_id: bigint("created_by_admin_id", { mode: "number", unsigned: true })
      .references(() => users.id, { onDelete: "set null" }),
    created_at: datetime("created_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updated_at: datetime("updated_at", { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("uq_promo_code").on(table.code),
    index("idx_promo_active_exp").on(table.is_active, table.expires_at),
  ]
);

/**
 * Global Referral Program Configuration (Admin Controlled)
 */
export const referral_settings = mysqlTable("referral_settings", {
  id: bigint("id", { mode: "number", unsigned: true })
    .autoincrement()
    .primaryKey(),
  is_enabled: boolean("is_enabled").notNull().default(true),
  max_referrals_per_student: int("max_referrals_per_student").notNull().default(5),
  referee_discount_type: mysqlEnum("referee_discount_type", ["FLAT", "PERCENT"])
    .notNull()
    .default("FLAT"),
  referee_discount_value: int("referee_discount_value").notNull().default(200),
  referrer_reward_type: mysqlEnum("referrer_reward_type", ["FLAT", "PERCENT"])
    .notNull()
    .default("FLAT"),
  referrer_reward_value: int("referrer_reward_value").notNull().default(800),
  reward_trigger: mysqlEnum("reward_trigger", ["ON_SUBSCRIPTION", "ON_SIGNUP"])
    .notNull()
    .default("ON_SUBSCRIPTION"),
  updated_by_admin_id: bigint("updated_by_admin_id", { mode: "number", unsigned: true })
    .references(() => users.id, { onDelete: "set null" }),
  updated_at: datetime("updated_at", { fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
});

export type PlanModel = typeof plans.$inferSelect;
export type OrderModel = typeof orders.$inferSelect;
export type SubscriptionModel = typeof subscriptions.$inferSelect;
export type ReferralModel = typeof referrals.$inferSelect;
export type ActivityTrackingEventModel = typeof activity_tracking_events.$inferSelect;
export type PromoReferralCodeModel = typeof promo_referral_codes.$inferSelect;
export type ReferralSettingsModel = typeof referral_settings.$inferSelect;
