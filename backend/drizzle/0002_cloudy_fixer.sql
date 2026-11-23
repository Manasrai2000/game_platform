CREATE TABLE `class_activities` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`class_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`version` int NOT NULL DEFAULT 1,
	`storage_path` varchar(255) NOT NULL,
	`entry_file` varchar(255) NOT NULL DEFAULT 'index.html',
	`total_checkpoints` int NOT NULL DEFAULT 3,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `class_activities_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_class_activity_package` UNIQUE(`class_id`)
);
--> statement-breakpoint
CREATE TABLE `student_journey_progress` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`class_id` bigint unsigned NOT NULL,
	`activity_id` bigint unsigned NOT NULL,
	`current_checkpoint` int NOT NULL DEFAULT 1,
	`max_completed_checkpoint` int NOT NULL DEFAULT 0,
	`journey_state` text,
	`is_journey_completed` boolean NOT NULL DEFAULT false,
	`last_played_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `student_journey_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_student_class_journey` UNIQUE(`user_id`,`class_id`)
);
--> statement-breakpoint
ALTER TABLE `class_activities` ADD CONSTRAINT `class_activities_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_journey_progress` ADD CONSTRAINT `student_journey_progress_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_journey_progress` ADD CONSTRAINT `student_journey_progress_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_journey_progress` ADD CONSTRAINT `student_journey_progress_activity_id_class_activities_id_fk` FOREIGN KEY (`activity_id`) REFERENCES `class_activities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_class_activity_active` ON `class_activities` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_student_journey_user` ON `student_journey_progress` (`user_id`);