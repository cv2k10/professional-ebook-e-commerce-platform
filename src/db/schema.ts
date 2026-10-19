import { relations } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// D1 is SQLite: enums are text columns constrained in TypeScript, UUIDs are generated in the app,
// timestamps are integer milliseconds and booleans are 0/1 integers.
export const userRoleValues = ["customer", "editor", "admin"] as const;
export const productStatusValues = ["draft", "published", "archived"] as const;
export const orderStatusValues = ["pending", "paid", "failed", "cancelled", "refunded", "disputed"] as const;
export const paymentProviderValues = ["stripe", "paypal", "manual"] as const;
export const paymentStatusValues = ["pending", "succeeded", "failed", "refunded", "disputed"] as const;
export const itemTypeValues = ["ebook", "bundle"] as const;
export const fileFormatValues = ["pdf", "epub", "mobi"] as const;

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const boolean = (name: string) => integer(name, { mode: "boolean" });

const timestamps = {
  createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
};

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role", { enum: userRoleValues }).default("customer").notNull(),
  emailVerifiedAt: timestamp("email_verified_at"),
  ...timestamps,
}, (t) => [uniqueIndex("users_email_uq").on(t.email)]);

export const sessions = sqliteTable("sessions", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
}, (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]);

export const authors = sqliteTable("authors", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  bio: text("bio"),
  ...timestamps,
}, (t) => [uniqueIndex("authors_slug_uq").on(t.slug)]);

export const categories = sqliteTable("categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  ...timestamps,
}, (t) => [uniqueIndex("categories_slug_uq").on(t.slug)]);

export const ebooks = sqliteTable("ebooks", {
  id: id(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description").notNull(),
  authorId: text("author_id").references(() => authors.id).notNull(),
  categoryId: text("category_id").references(() => categories.id).notNull(),
  coverKey: text("cover_key"),
  priceCents: integer("price_cents").notNull(),
  salePriceCents: integer("sale_price_cents"),
  language: text("language").default("English").notNull(),
  publishedOn: timestamp("published_on"),
  status: text("status", { enum: productStatusValues }).default("draft").notNull(),
  featured: boolean("featured").default(false).notNull(),
  tableOfContents: text("table_of_contents", { mode: "json" }).$type<string[]>().$defaultFn(() => []).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("ebooks_slug_uq").on(t.slug), index("ebooks_category_idx").on(t.categoryId), index("ebooks_status_idx").on(t.status)]);

export const productFiles = sqliteTable("product_files", {
  id: id(),
  ebookId: text("ebook_id").references(() => ebooks.id, { onDelete: "cascade" }).notNull(),
  format: text("format", { enum: fileFormatValues }).notNull(),
  storageKey: text("storage_key").notNull(),
  sizeBytes: integer("size_bytes"),
  isSample: boolean("is_sample").default(false).notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
}, (t) => [index("product_files_ebook_idx").on(t.ebookId)]);

export const bundles = sqliteTable("bundles", {
  id: id(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverKey: text("cover_key"),
  priceCents: integer("price_cents").notNull(),
  status: text("status", { enum: productStatusValues }).default("draft").notNull(),
  featured: boolean("featured").default(false).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("bundles_slug_uq").on(t.slug), index("bundles_status_idx").on(t.status)]);

export const bundleItems = sqliteTable("bundle_items", {
  bundleId: text("bundle_id").references(() => bundles.id, { onDelete: "cascade" }).notNull(),
  ebookId: text("ebook_id").references(() => ebooks.id, { onDelete: "cascade" }).notNull(),
}, (t) => [primaryKey({ columns: [t.bundleId, t.ebookId] })]);

export const coupons = sqliteTable("coupons", {
  id: id(),
  code: text("code").notNull(),
  percentOff: integer("percent_off"),
  amountOffCents: integer("amount_off_cents"),
  active: boolean("active").default(true).notNull(),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  maxRedemptions: integer("max_redemptions"),
  redemptionCount: integer("redemption_count").default(0).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex("coupons_code_uq").on(t.code)]);

export const orders = sqliteTable("orders", {
  id: id(),
  orderNumber: text("order_number").notNull(),
  userId: text("user_id").references(() => users.id),
  customerEmail: text("customer_email").notNull(),
  status: text("status", { enum: orderStatusValues }).default("pending").notNull(),
  currency: text("currency").default("usd").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  discountCents: integer("discount_cents").default(0).notNull(),
  taxCents: integer("tax_cents").default(0).notNull(),
  totalCents: integer("total_cents").notNull(),
  couponId: text("coupon_id").references(() => coupons.id),
  accessTokenHash: text("access_token_hash"),
  paidAt: timestamp("paid_at"),
  ...timestamps,
}, (t) => [uniqueIndex("orders_number_uq").on(t.orderNumber), index("orders_email_idx").on(t.customerEmail), index("orders_status_idx").on(t.status)]);

export const orderItems = sqliteTable("order_items", {
  id: id(),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  itemType: text("item_type", { enum: itemTypeValues }).notNull(),
  catalogKey: text("catalog_key").notNull(),
  ebookId: text("ebook_id").references(() => ebooks.id),
  bundleId: text("bundle_id").references(() => bundles.id),
  titleSnapshot: text("title_snapshot").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
}, (t) => [index("order_items_order_idx").on(t.orderId)]);

export const payments = sqliteTable("payments", {
  id: id(),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider", { enum: paymentProviderValues }).notNull(),
  providerReference: text("provider_reference").notNull(),
  status: text("status", { enum: paymentStatusValues }).default("pending").notNull(),
  amountCents: integer("amount_cents").notNull(),
  rawEventId: text("raw_event_id"),
  ...timestamps,
}, (t) => [uniqueIndex("payments_provider_ref_uq").on(t.provider, t.providerReference), uniqueIndex("payments_event_uq").on(t.rawEventId), index("payments_order_idx").on(t.orderId)]);

export const entitlements = sqliteTable("entitlements", {
  id: id(),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id),
  customerEmail: text("customer_email").notNull(),
  ebookKey: text("ebook_key").notNull(),
  ebookId: text("ebook_id").references(() => ebooks.id),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
}, (t) => [uniqueIndex("entitlement_order_ebook_uq").on(t.orderId, t.ebookKey), index("entitlement_user_idx").on(t.userId), index("entitlement_email_idx").on(t.customerEmail)]);

export const downloadLogs = sqliteTable("download_logs", {
  id: id(),
  entitlementId: text("entitlement_id").references(() => entitlements.id, { onDelete: "cascade" }).notNull(),
  // Downloads stream from R2 by catalog key, so a product_files row is optional
  productFileId: text("product_file_id").references(() => productFiles.id),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  ebookKey: text("ebook_key").notNull(),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
}, (t) => [index("download_entitlement_idx").on(t.entitlementId, t.createdAt), index("download_order_idx").on(t.orderId, t.createdAt)]);

export const reviews = sqliteTable("reviews", {
  id: id(),
  userId: text("user_id").references(() => users.id).notNull(),
  ebookId: text("ebook_id").references(() => ebooks.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  approved: boolean("approved").default(false).notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
}, (t) => [uniqueIndex("reviews_user_ebook_uq").on(t.userId, t.ebookId), index("reviews_ebook_idx").on(t.ebookId)]);

export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: id(),
  email: text("email").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
}, (t) => [uniqueIndex("newsletter_email_uq").on(t.email)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: id(),
  actorUserId: text("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
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
