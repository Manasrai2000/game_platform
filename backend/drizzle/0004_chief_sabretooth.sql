CREATE TABLE `email_verifications` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`otp_code` varchar(10) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`is_verified` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `email_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_email_verif_email` ON `email_verifications` (`email`);--> statement-breakpoint
CREATE INDEX `idx_email_verif_expires` ON `email_verifications` (`expires_at`);