CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `authors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`bio` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `authors_slug_uq` ON `authors` (`slug`);--> statement-breakpoint
CREATE TABLE `bundle_items` (
	`bundle_id` text NOT NULL,
	`ebook_id` text NOT NULL,
	PRIMARY KEY(`bundle_id`, `ebook_id`),
	FOREIGN KEY (`bundle_id`) REFERENCES `bundles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ebook_id`) REFERENCES `ebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bundles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`cover_key` text,
	`price_cents` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bundles_slug_uq` ON `bundles` (`slug`);--> statement-breakpoint
CREATE INDEX `bundles_status_idx` ON `bundles` (`status`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_uq` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`percent_off` integer,
	`amount_off_cents` integer,
	`active` integer DEFAULT true NOT NULL,
	`starts_at` integer,
	`expires_at` integer,
	`max_redemptions` integer,
	`redemption_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_code_uq` ON `coupons` (`code`);--> statement-breakpoint
CREATE TABLE `download_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`entitlement_id` text NOT NULL,
	`product_file_id` text,
	`order_id` text NOT NULL,
	`ebook_key` text NOT NULL,
	`ip_hash` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entitlement_id`) REFERENCES `entitlements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_file_id`) REFERENCES `product_files`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `download_entitlement_idx` ON `download_logs` (`entitlement_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `download_order_idx` ON `download_logs` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ebooks` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`description` text NOT NULL,
	`author_id` text NOT NULL,
	`category_id` text NOT NULL,
	`cover_key` text,
	`price_cents` integer NOT NULL,
	`sale_price_cents` integer,
	`language` text DEFAULT 'English' NOT NULL,
	`published_on` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`table_of_contents` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ebooks_slug_uq` ON `ebooks` (`slug`);--> statement-breakpoint
CREATE INDEX `ebooks_category_idx` ON `ebooks` (`category_id`);--> statement-breakpoint
CREATE INDEX `ebooks_status_idx` ON `ebooks` (`status`);--> statement-breakpoint
CREATE TABLE `entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`user_id` text,
	`customer_email` text NOT NULL,
	`ebook_key` text NOT NULL,
	`ebook_id` text,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ebook_id`) REFERENCES `ebooks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entitlement_order_ebook_uq` ON `entitlements` (`order_id`,`ebook_key`);--> statement-breakpoint
CREATE INDEX `entitlement_user_idx` ON `entitlements` (`user_id`);--> statement-breakpoint
CREATE INDEX `entitlement_email_idx` ON `entitlements` (`customer_email`);--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_email_uq` ON `newsletter_subscribers` (`email`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`item_type` text NOT NULL,
	`catalog_key` text NOT NULL,
	`ebook_id` text,
	`bundle_id` text,
	`title_snapshot` text NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ebook_id`) REFERENCES `ebooks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bundle_id`) REFERENCES `bundles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`user_id` text,
	`customer_email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`subtotal_cents` integer NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`tax_cents` integer DEFAULT 0 NOT NULL,
	`total_cents` integer NOT NULL,
	`coupon_id` text,
	`access_token_hash` text,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_uq` ON `orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `orders_email_idx` ON `orders` (`customer_email`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_reference` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`amount_cents` integer NOT NULL,
	`raw_event_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_provider_ref_uq` ON `payments` (`provider`,`provider_reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_event_uq` ON `payments` (`raw_event_id`);--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE TABLE `product_files` (
	`id` text PRIMARY KEY NOT NULL,
	`ebook_id` text NOT NULL,
	`format` text NOT NULL,
	`storage_key` text NOT NULL,
	`size_bytes` integer,
	`is_sample` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ebook_id`) REFERENCES `ebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_files_ebook_idx` ON `product_files` (`ebook_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ebook_id` text NOT NULL,
	`rating` integer NOT NULL,
	`title` text,
	`body` text,
	`approved` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ebook_id`) REFERENCES `ebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_user_ebook_uq` ON `reviews` (`user_id`,`ebook_id`);--> statement-breakpoint
CREATE INDEX `reviews_ebook_idx` ON `reviews` (`ebook_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_uq` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`first_name` text,
	`last_name` text,
	`role` text DEFAULT 'customer' NOT NULL,
	`email_verified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);