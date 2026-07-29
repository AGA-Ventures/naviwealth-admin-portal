CREATE TABLE `datasets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`member_ids` text DEFAULT '[]' NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`reuse_count` integer DEFAULT 0 NOT NULL,
	`validation_state` text DEFAULT 'valid' NOT NULL,
	`last_used_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
