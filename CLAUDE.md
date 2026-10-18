# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Folio" — a Next.js 16 App Router eBook store (React 19, TypeScript strict, Tailwind v4, PostgreSQL via Drizzle ORM) with Stripe Checkout, PayPal Orders, signed private downloads, Resend email, and a role-gated `/admin`. See README.md for provider sandbox setup (Stripe CLI forwarding, PayPal webhook events, admin promotion SQL).

## Commands

```bash
npm run dev            # next dev on http://localhost:3000
npm run build
npm run lint           # eslint . (flat config, next/core-web-vitals)
npm run typecheck      # tsc --noEmit
npx next typegen       # generate route types (run before typecheck in CI, per README)
npx drizzle-kit push   # apply src/db/schema.ts to the database
```

There is no test framework configured. Verification is lint + typecheck + build.

`drizzle.config.json` hardcodes the database URL (`postgresql://postgres:postgres@127.0.0.1:5432/app_db`) rather than reading `.env`; edit it if your DB differs. The app itself requires `DATABASE_URL` (`src/db/index.ts` throws at import if missing). Env vars are listed in `.env.example`.

## Architecture

**Two catalog sources — the important quirk.** The storefront, cart, checkout pricing, entitlement expansion, and download lookup all use the static in-code catalog in `src/lib/catalog.ts` (`books`, `bundles`, `getCatalogItem`, `money`). Items are identified by stable string keys such as `book-deep-work` / bundle ids. The DB schema also defines `ebooks`, `bundles`, `bundle_items`, `product_files`, `authors`, `categories`, etc. with UUIDs, but these are not yet wired in — order items and entitlements store the string `catalogKey` / `ebookKey` (the UUID FK columns are nullable placeholders). The admin products page also renders from the static catalog. Any move to DB-managed products must update checkout, `fulfillOrder`, the download route, and the admin page together.

**Order/payment flow:**
1. `POST /api/checkout` validates with zod, rebuilds prices server-side from the catalog (never trust client prices), inserts a `pending` order + `order_items` (with title/price snapshots), then creates a Stripe Checkout Session (`metadata.orderId`) or a PayPal order, recording a `pending` `payments` row keyed by provider reference.
2. Fulfillment goes through `fulfillOrder()` in `src/lib/payments.ts` — the single place that marks an order paid. It runs in a transaction with `SELECT … FOR UPDATE` on the order, is idempotent (returns early if already paid), expands bundles into per-book entitlements, and relies on the `(order_id, ebook_key)` unique index with `onConflictDoNothing`. It fires the receipt email (no-op without `RESEND_API_KEY`).
   - Stripe: fulfilled only from the signed webhook (`/api/webhooks/stripe`), not the success redirect.
   - PayPal: `/api/paypal/capture` (return URL) captures server-side then fulfills; `/api/webhooks/paypal` handles verified events.
3. Refund/dispute webhooks call `revokeOrder()`, which sets the order status and stamps `revokedAt` on its entitlements.

**Downloads.** `GET /api/download/[key]?order=…&access=…` requires an HMAC guest token (`createGuestToken`/`verifyGuestToken`, signed with `DOWNLOAD_TOKEN_SECRET`, format `orderId.exp.sig`), a paid order, and an unrevoked entitlement. It streams `${PRIVATE_EBOOK_DIR}/${key}.pdf` (default `./private-ebooks`) with a path-traversal check. Rate limiting is an in-memory `Map` on `globalThis` (10 per order per 15 min) — single-instance only. Never put eBook files under `public/`.

**Auth.** Custom session auth in `src/lib/auth.ts`: random token in the HTTP-only `folio_session` cookie, only its SHA-256 hash stored in `sessions`. `getCurrentUser()` is used in server components/route handlers; admin pages check `user.role === "admin"` server-side. `/api/auth` handles login/register/logout via an `action` field. Passwords use bcryptjs.

**Client state.** `src/components/store-client.tsx` holds the `CartProvider` (cart is an array of catalog keys in `localStorage` under `folio-cart`) and shared client components; `store-ui.tsx` holds server-safe UI pieces. Static marketing pages (about, contact, faq, privacy, …) are content objects in `src/app/[slug]/page.tsx`.

## Conventions

- Next 16: route `params` are `Promise`s and must be awaited.
- Import alias `@/*` → `src/*`. DB access via `db` from `@/db`, tables from `@/db/schema`.
- Money is stored as integer cents in the DB; the static catalog uses dollar floats converted with `Math.round(price*100)`.
- Route handlers and `src/lib/*` are written in a dense, mostly single-line style; components are conventionally formatted. Match the surrounding file.
- Missing provider credentials should degrade gracefully (503 / no-op) rather than crash, as existing routes do.
