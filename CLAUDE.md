# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Folio" — a Next.js 16 App Router eBook store (React 19, TypeScript strict, Tailwind v4) that runs on **Cloudflare Workers via vinext** (Vite reimplementation of the Next.js API; `next build`/`next dev` are not used). Data is in **Cloudflare D1** via Drizzle (`drizzle-orm/d1`), eBook files in a private **R2** bucket. Stripe Checkout, PayPal Orders, signed downloads, Resend email, role-gated `/admin`. See README.md for provider sandbox setup and deploy steps.

## Commands

```bash
npm run dev               # vite dev (workerd + local D1/R2) on http://localhost:3000
npm run build             # vite build
npm run deploy            # build + deploy to Cloudflare Workers
npm run lint              # eslint . (flat config, next/core-web-vitals)
npm run typecheck         # cf workers types && tsc --noEmit
npm run db:generate       # drizzle-kit: schema.ts -> new SQL file in migrations/
npm run db:migrate:local  # apply migrations to the local D1 (run `npm run dev` once first)
npm run db:migrate:remote -- <d1-database-id>
```

There is no test framework configured. Verification is lint + typecheck + build, plus exercising routes against `npm run dev`.

**Cloudflare config lives in `cloudflare.config.ts`** (the `cf` CLI format, not `wrangler.jsonc`). Bindings: `DB` (D1 `folio-db`), `EBOOKS` (R2 `folio-ebooks`), `ASSETS`, plus secrets/text vars. **Only names declared there reach the Worker** — an env var that is not declared is `undefined` in both `env` and `process.env`, even if it is in `.env`. Add a `bindings.secret()` entry when introducing a new secret. Locally values come from `.env` (see `.env.example`); types are generated into `.cloudflare/types/` by `cf workers types`. Server code reads bindings with `import { env, waitUntil } from "cloudflare:workers"`; existing code reads secrets via `process.env` (populated by `nodejs_compat`).

Local state (D1 SQLite, R2 objects) lives in `.cloudflare/state` (gitignored). `cf d1 migrations apply --local` needs a database UUID that does not exist locally, which is why `scripts/migrate-local.mjs` writes to the local SQLite file directly using the same `d1_migrations` table. Upload local test files with `npx cf r2 objects put <key>.pdf --bucket-name folio-ebooks --file <path> --local --persist-to .cloudflare/state`.

## Architecture

**Two catalog sources — the important quirk.** The storefront, cart, checkout pricing, entitlement expansion, and download lookup all use the static in-code catalog in `src/lib/catalog.ts` (`books`, `bundles`, `getCatalogItem`, `money`). Items are identified by stable string keys such as `book-deep-work` / bundle ids. The DB schema also defines `ebooks`, `bundles`, `bundle_items`, `product_files`, `authors`, `categories`, etc. with UUIDs, but these are not yet wired in — order items and entitlements store the string `catalogKey` / `ebookKey` (the UUID FK columns are nullable placeholders). The admin products page also renders from the static catalog. Any move to DB-managed products must update checkout, `fulfillOrder`, the download route, and the admin page together.

**Order/payment flow:**
1. `POST /api/checkout` validates with zod, rebuilds prices server-side from the catalog (never trust client prices), inserts a `pending` order + `order_items` (with title/price snapshots), then creates a Stripe Checkout Session (`metadata.orderId`) or a PayPal order, recording a `pending` `payments` row keyed by provider reference.
2. Fulfillment goes through `fulfillOrder()` in `src/lib/payments.ts` — the single place that marks an order paid. D1 has no interactive transactions or `FOR UPDATE`, so it is one atomic `db.batch`: a conditional `UPDATE … WHERE status IN (pending, failed, cancelled) RETURNING` claims the order (exactly one concurrent caller gets a row back and sends the email via `waitUntil`), the payment is upserted on `(provider, provider_reference)`, and entitlements (bundles expanded) insert with `onConflictDoNothing` on `(order_id, ebook_key)`. Refunded/disputed orders are never re-opened. Keep this shape when changing it — any multi-statement write that must be atomic needs `db.batch`.
   - Stripe: fulfilled only from the signed webhook (`/api/webhooks/stripe`), not the success redirect.
   - PayPal: `/api/paypal/capture` (return URL) captures server-side then fulfills; `/api/webhooks/paypal` handles verified events.
3. Refund/dispute webhooks call `revokeOrder()`, which sets the order status and stamps `revokedAt` on its entitlements.

**Downloads.** `GET /api/download/[key]?order=…&access=…` requires an HMAC guest token (`createGuestToken`/`verifyGuestToken`, signed with `DOWNLOAD_TOKEN_SECRET`, format `orderId.exp.sig`), a paid order, and an unrevoked entitlement. It streams R2 object `${key}.pdf` from the `EBOOKS` binding. Rate limiting counts `download_logs` rows for the order in D1 (10 per 15 min), so it holds across Worker isolates; each successful download inserts a log row. Never put eBook files under `public/` or make the bucket public.

**Auth.** Custom session auth in `src/lib/auth.ts`: random token in the HTTP-only `folio_session` cookie, only its SHA-256 hash stored in `sessions`. `getCurrentUser()` is used in server components/route handlers; admin pages check `user.role === "admin"` server-side. `/api/auth` handles login/register/logout via an `action` field. Passwords use bcryptjs.

**Client state.** `src/components/store-client.tsx` holds the `CartProvider` (cart is an array of catalog keys in `localStorage` under `folio-cart`) and shared client components; `store-ui.tsx` holds server-safe UI pieces. Static marketing pages (about, contact, faq, privacy, …) are content objects in `src/app/[slug]/page.tsx`.

## Conventions

- Next 16: route `params` are `Promise`s and must be awaited.
- Import alias `@/*` → `src/*`. DB access via `db` from `@/db`, tables from `@/db/schema`.
- D1 is SQLite: UUIDs are generated in app code (`$defaultFn(crypto.randomUUID)`), timestamps are integer ms (`mode: "timestamp_ms"` → `Date`), booleans are 0/1, enums are TS-only `text({ enum })` constraints.
- Workers runtime types make `Response.json()` return `unknown`; annotate the expected shape (`as {...}`).
- Money is stored as integer cents in the DB; the static catalog uses dollar floats converted with `Math.round(price*100)`.
- Route handlers and `src/lib/*` are written in a dense, mostly single-line style; components are conventionally formatted. Match the surrounding file.
- Missing provider credentials should degrade gracefully (503 / no-op) rather than crash, as existing routes do.
