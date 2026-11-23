CREATE TABLE `classes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `state` varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_classes_order` ON `classes` (`display_order`);--> statement-breakpoint
CREATE INDEX `idx_classes_active` ON `classes` (`is_active`);