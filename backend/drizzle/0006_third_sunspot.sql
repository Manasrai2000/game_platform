CREATE TABLE `promo_referral_codes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`label` varchar(150) NOT NULL DEFAULT 'Admin Referral',
	`discount_percent` int NOT NULL DEFAULT 10,
	`discount_flat_inr` int NOT NULL DEFAULT 0,
	`max_uses` int,
	`used_count` int NOT NULL DEFAULT 0,
	`expires_at` datetime(3) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by_admin_id` bigint unsigned,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `promo_referral_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_promo_code` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `plans` ADD `class_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `promo_referral_codes` ADD CONSTRAINT `promo_referral_codes_created_by_admin_id_users_id_fk` FOREIGN KEY (`created_by_admin_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_promo_active_exp` ON `promo_referral_codes` (`is_active`,`expires_at`);--> statement-breakpoint
ALTER TABLE `plans` ADD CONSTRAINT `plans_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_plans_class_active` ON `plans` (`class_id`,`is_active`);