CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`full_name` varchar(150) NOT NULL,
	`mobile_number` varchar(20) NOT NULL,
	`class_grade` varchar(50) NOT NULL,
	`school_name` varchar(200) NOT NULL,
	`role` enum('STUDENT','ADMIN') NOT NULL DEFAULT 'STUDENT',
	`is_active` boolean NOT NULL DEFAULT true,
	`email_verified_at` datetime(3),
	`mfa_secret_enc` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_users_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `user_devices` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`device_token_hash` varchar(64) NOT NULL,
	`public_key_spki` text,
	`dbsc_session_id` varchar(128),
	`device_label` varchar(200) NOT NULL,
	`status` enum('ACTIVE','REVOKED') NOT NULL DEFAULT 'ACTIVE',
	`active_slot` tinyint GENERATED ALWAYS AS (IF(`user_devices`.`status` = 'ACTIVE', 1, NULL)) VIRTUAL,
	`bound_ip` varchar(45) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`revoked_at` datetime(3),
	`revoked_by_admin_id` bigint unsigned,
	`revoke_reason` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_user_one_active_device` UNIQUE(`user_id`,`active_slot`),
	CONSTRAINT `uq_device_token_hash` UNIQUE(`device_token_hash`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`device_id` bigint unsigned,
	`session_token_hash` varchar(64) NOT NULL,
	`ip_address` varchar(45) NOT NULL,
	`user_agent` varchar(512) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_session_token_hash` UNIQUE(`session_token_hash`)
);
--> statement-breakpoint
CREATE TABLE `auth_audit_logs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_user_id` bigint unsigned,
	`target_user_id` bigint unsigned,
	`event_type` varchar(64) NOT NULL,
	`ip_address` varchar(45) NOT NULL,
	`metadata_json` json,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `auth_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_devices` ADD CONSTRAINT `user_devices_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_devices` ADD CONSTRAINT `user_devices_revoked_by_admin_id_users_id_fk` FOREIGN KEY (`revoked_by_admin_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_device_id_user_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `user_devices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_users_mobile` ON `users` (`mobile_number`);--> statement-breakpoint
CREATE INDEX `idx_users_role_active` ON `users` (`role`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_devices_user_status` ON `user_devices` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_active` ON `sessions` (`user_id`,`revoked_at`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_target_time` ON `auth_audit_logs` (`target_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_event_time` ON `auth_audit_logs` (`event_type`,`created_at`);