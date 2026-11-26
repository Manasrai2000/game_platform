CREATE TABLE `support_tickets` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`ticket_number` varchar(32) NOT NULL,
	`user_id` bigint unsigned,
	`is_registered_user` boolean NOT NULL DEFAULT false,
	`requester_name` varchar(150) NOT NULL,
	`requester_email` varchar(255) NOT NULL,
	`requester_mobile` varchar(20),
	`category` enum('LOGIN_DEVICE_LOCK','REGISTRATION_OTP','PASSWORD_RESET','PAYMENT_SUBSCRIPTION','ACTIVITY_BUG','OTHER') NOT NULL DEFAULT 'OTHER',
	`subject` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`status` enum('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
	`priority` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
	`admin_reply` text,
	`resolved_by_admin_id` bigint unsigned,
	`resolved_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_support_ticket_number` UNIQUE(`ticket_number`)
);
--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_resolved_by_admin_id_users_id_fk` FOREIGN KEY (`resolved_by_admin_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_support_status_created` ON `support_tickets` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_support_email` ON `support_tickets` (`requester_email`);