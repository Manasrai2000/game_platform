CREATE TABLE `referral_settings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`max_referrals_per_student` int NOT NULL DEFAULT 5,
	`referee_discount_type` enum('FLAT','PERCENT') NOT NULL DEFAULT 'FLAT',
	`referee_discount_value` int NOT NULL DEFAULT 200,
	`referrer_reward_type` enum('FLAT','PERCENT') NOT NULL DEFAULT 'FLAT',
	`referrer_reward_value` int NOT NULL DEFAULT 800,
	`reward_trigger` enum('ON_SUBSCRIPTION','ON_SIGNUP') NOT NULL DEFAULT 'ON_SUBSCRIPTION',
	`updated_by_admin_id` bigint unsigned,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `referral_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `referrals` MODIFY COLUMN `status` enum('REGISTERED','APPLIED','REWARDED') NOT NULL DEFAULT 'REGISTERED';--> statement-breakpoint
ALTER TABLE `orders` ADD `wallet_discount_used` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `referral_settings` ADD CONSTRAINT `referral_settings_updated_by_admin_id_users_id_fk` FOREIGN KEY (`updated_by_admin_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;