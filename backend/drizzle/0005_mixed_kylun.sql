CREATE TABLE `activity_tracking_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`class_id` bigint unsigned,
	`event_type` varchar(64) NOT NULL,
	`event_metadata` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `activity_tracking_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`plan_id` bigint unsigned NOT NULL,
	`base_amount` int NOT NULL,
	`discount_amount` int NOT NULL DEFAULT 0,
	`final_amount` int NOT NULL,
	`referral_code_used` varchar(32),
	`status` enum('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
	`gateway` varchar(32) NOT NULL DEFAULT 'RAZORPAY',
	`gateway_order_id` varchar(100) NOT NULL,
	`gateway_payment_id` varchar(100),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_gateway_order_id` UNIQUE(`gateway_order_id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`title` varchar(150) NOT NULL,
	`description` text,
	`price_inr` int NOT NULL,
	`duration_days` int NOT NULL,
	`badge` varchar(50),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_plan_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`referrer_id` bigint unsigned NOT NULL,
	`referee_id` bigint unsigned NOT NULL,
	`referral_code` varchar(32) NOT NULL,
	`discount_given` int NOT NULL DEFAULT 0,
	`reward_credited` int NOT NULL DEFAULT 0,
	`status` enum('APPLIED','REWARDED') NOT NULL DEFAULT 'APPLIED',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_referral_referee` UNIQUE(`referee_id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`plan_id` bigint unsigned NOT NULL,
	`order_id` bigint unsigned,
	`status` enum('ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
	`starts_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `referral_code` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `referred_by_code` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `reward_wallet_balance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `class_activities` ADD `demo_checkpoints_count` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `uq_users_referral_code` UNIQUE(`referral_code`);--> statement-breakpoint
ALTER TABLE `activity_tracking_events` ADD CONSTRAINT `activity_tracking_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_tracking_events` ADD CONSTRAINT `activity_tracking_events_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrer_id_users_id_fk` FOREIGN KEY (`referrer_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referee_id_users_id_fk` FOREIGN KEY (`referee_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_tracking_user_type` ON `activity_tracking_events` (`user_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `idx_orders_user` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_referrals_referrer` ON `referrals` (`referrer_id`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_user_status` ON `subscriptions` (`user_id`,`status`);