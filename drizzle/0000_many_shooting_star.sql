CREATE TABLE `study_notes` (
	`id` integer NOT NULL,
	`owner_key` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'FIT2004' NOT NULL,
	`updated_at` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_notes_owner_id` ON `study_notes` (`owner_key`,`id`);