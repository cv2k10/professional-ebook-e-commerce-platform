import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["customer", "editor", "admin"]);
export const productStatus = pgEnum("product_status", ["draft", "published", "archived"]);
export const orderStatus = pgEnum("order_status", ["pending", "paid", "failed", "cancelled", "refunded", "disputed"]);
export const paymentProvider = pgEnum("payment_provider", ["stripe", "paypal", "manual"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "succeeded", "failed", "refunded", "disputed"]);
export const itemType = pgEnum("item_type", ["ebook", "bundle"]);
export const fileFormat = pgEnum("file_format", ["pdf", "epub", "mobi"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: userRole("role").default("customer").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex("users_email_uq").on(t.email)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]);

export const authors = pgTable("authors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  bio: text("bio"),
  ...timestamps,
}, (t) => [uniqueIndex("authors_slug_uq").on(t.slug)]);

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  ...timestamps,
}, (t) => [uniqueIndex("categories_slug_uq").on(t.slug)]);

export const ebooks = pgTable("ebooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description").notNull(),
  authorId: uuid("author_id").references(() => authors.id).notNull(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  coverKey: text("cover_key"),
  priceCents: integer("price_cents").notNull(),
  salePriceCents: integer("sale_price_cents"),
  language: text("language").default("English").notNull(),
  publishedOn: timestamp("published_on", { withTimezone: true }),
  status: productStatus("status").default("draft").notNull(),
  featured: boolean("featured").default(false).notNull(),
  tableOfContents: jsonb("table_of_contents").$type<string[]>().default([]).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("ebooks_slug_uq").on(t.slug), index("ebooks_category_idx").on(t.categoryId), index("ebooks_status_idx").on(t.status)]);

export const productFiles = pgTable("product_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  ebookId: uuid("ebook_id").references(() => ebooks.id, { onDelete: "cascade" }).notNull(),
  format: fileFormat("format").notNull(),
  storageKey: text("storage_key").notNull(),
  sizeBytes: integer("size_bytes"),
  isSample: boolean("is_sample").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("product_files_ebook_idx").on(t.ebookId)]);

export const bundles = pgTable("bundles", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverKey: text("cover_key"),
  priceCents: integer("price_cents").notNull(),
  status: productStatus("status").default("draft").notNull(),
  featured: boolean("featured").default(false).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("bundles_slug_uq").on(t.slug), index("bundles_status_idx").on(t.status)]);

export const bundleItems = pgTable("bundle_items", {
  bundleId: uuid("bundle_id").references(() => bundles.id, { onDelete: "cascade" }).notNull(),
  ebookId: uuid("ebook_id").references(() => ebooks.id, { onDelete: "cascade" }).notNull(),
}, (t) => [primaryKey({ columns: [t.bundleId, t.ebookId] })]);

export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull(),
  percentOff: integer("percent_off"),
  amountOffCents: integer("amount_off_cents"),
  active: boolean("active").default(true).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").default(0).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("coupons_code_uq").on(t.code)]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: text("order_number").notNull(),
  userId: uuid("user_id").references(() => users.id),
  customerEmail: text("customer_email").notNull(),
  status: orderStatus("status").default("pending").notNull(),
  currency: text("currency").default("usd").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  discountCents: integer("discount_cents").default(0).notNull(),
  taxCents: integer("tax_cents").default(0).notNull(),
  totalCents: integer("total_cents").notNull(),
  couponId: uuid("coupon_id").references(() => coupons.id),
  accessTokenHash: text("access_token_hash"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex("orders_number_uq").on(t.orderNumber), index("orders_email_idx").on(t.customerEmail), index("orders_status_idx").on(t.status)]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  itemType: itemType("item_type").notNull(),
  catalogKey: text("catalog_key").notNull(),
  ebookId: uuid("ebook_id").references(() => ebooks.id),
  bundleId: uuid("bundle_id").references(() => bundles.id),
  titleSnapshot: text("title_snapshot").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("order_items_order_idx").on(t.orderId)]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  provider: paymentProvider("provider").notNull(),
  providerReference: text("provider_reference").notNull(),
  status: paymentStatus("status").default("pending").notNull(),
  amountCents: integer("amount_cents").notNull(),
  rawEventId: text("raw_event_id"),
  ...timestamps,
}, (t) => [uniqueIndex("payments_provider_ref_uq").on(t.provider, t.providerReference), uniqueIndex("payments_event_uq").on(t.rawEventId), index("payments_order_idx").on(t.orderId)]);

export const entitlements = pgTable("entitlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  customerEmail: text("customer_email").notNull(),
  ebookKey: text("ebook_key").notNull(),
  ebookId: uuid("ebook_id").references(() => ebooks.id),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("entitlement_order_ebook_uq").on(t.orderId, t.ebookKey), index("entitlement_user_idx").on(t.userId), index("entitlement_email_idx").on(t.customerEmail)]);

export const downloadLogs = pgTable("download_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  entitlementId: uuid("entitlement_id").references(() => entitlements.id, { onDelete: "cascade" }).notNull(),
  productFileId: uuid("product_file_id").references(() => productFiles.id).notNull(),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("download_entitlement_idx").on(t.entitlementId, t.createdAt)]);

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  ebookId: uuid("ebook_id").references(() => ebooks.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  approved: boolean("approved").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("reviews_user_ebook_uq").on(t.userId, t.ebookId), index("reviews_ebook_idx").on(t.ebookId)]);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("newsletter_email_uq").on(t.email)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("audit_entity_idx").on(t.entityType, t.entityId)]);

export const ebooksRelations = relations(ebooks, ({ one, many }) => ({
  author: one(authors, { fields: [ebooks.authorId], references: [authors.id] }),
  category: one(categories, { fields: [ebooks.categoryId], references: [categories.id] }),
  files: many(productFiles),
  bundleItems: many(bundleItems),
}));

export const bundlesRelations = relations(bundles, ({ many }) => ({ items: many(bundleItems) }));
export const bundleItemsRelations = relations(bundleItems, ({ one }) => ({
  bundle: one(bundles, { fields: [bundleItems.bundleId], references: [bundles.id] }),
  ebook: one(ebooks, { fields: [bundleItems.ebookId], references: [ebooks.id] }),
}));
export const ordersRelations = relations(orders, ({ many }) => ({ items: many(orderItems), payments: many(payments), entitlements: many(entitlements) }));
