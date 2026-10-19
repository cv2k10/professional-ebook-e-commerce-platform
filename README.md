# Folio Digital Bookshop

A full-stack Next.js App Router eBook shop running on Cloudflare Workers via [vinext](https://github.com/cloudflare/vinext), with Cloudflare D1 (Drizzle ORM), private eBook files in Cloudflare R2, Stripe Checkout, PayPal Orders, transactional email, and role-protected administration.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set at least `DOWNLOAD_TOKEN_SECRET`. Only variables declared in `cloudflare.config.ts` reach the Worker.
3. Run `npm run dev` once so the local D1 and R2 state is created under `.cloudflare/state`, then apply the schema with `npm run db:migrate:local`.
4. Open `http://localhost:3000`.

Local D1 and R2 are simulated by Miniflare; no Cloudflare account is needed for development. To make a book downloadable locally, upload a PDF to the local bucket:

`npx cf r2 objects put book-deep-work.pdf --bucket-name folio-ebooks --file ./book-deep-work.pdf --content-type application/pdf --local --persist-to .cloudflare/state`

The storefront demonstration catalog lives in `src/lib/catalog.ts`; all checkout prices are rebuilt from this server-owned catalog. The D1 schema is ready for replacing those records with admin-managed catalog queries.

Schema changes: edit `src/db/schema.ts`, run `npm run db:generate` to write a new file to `migrations/`, then `npm run db:migrate:local`.

## Deploy to Cloudflare

1. Sign in with `npx cf auth login`.
2. Run `npm run deploy`. The D1 database `folio-db` and R2 bucket `folio-ebooks` are declared in `cloudflare.config.ts` by name and are created on first deploy if they do not exist.
3. Find the database ID with `npx cf d1 list`, then apply migrations: `npm run db:migrate:remote -- <database-id>`.
4. Set every secret declared in `cloudflare.config.ts` (`npx cf workers secrets update --help` shows the syntax; `cf workers secrets bulk` sets several at once).
5. Set `NEXT_PUBLIC_SITE_URL` in `.env` (or the build environment) to the production URL before building, since it is inlined at build time.
6. Upload eBook files to the `folio-ebooks` bucket with `npx cf r2 objects put <key>.pdf --bucket-name folio-ebooks --file <path>` (without `--local`).

## Stripe sandbox

Create a Stripe account, copy an `sk_test_...` key to `STRIPE_SECRET_KEY`, and forward test events:

`stripe listen --forward-to localhost:3000/api/webhooks/stripe`

Copy the returned `whsec_...` to `STRIPE_WEBHOOK_SECRET`. Subscribe production webhooks to `https://your-domain/api/webhooks/stripe`. Required events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, and `charge.dispute.created`. Use Stripe test card `4242 4242 4242 4242` with any future expiry and CVC.

## PayPal sandbox

Create a REST app in the PayPal Developer Dashboard. Set its sandbox client ID and secret, leave `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`, create a webhook pointing to `/api/webhooks/paypal`, and copy its ID to `PAYPAL_WEBHOOK_ID`. Subscribe to `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, and `CUSTOMER.DISPUTE.CREATED`. For production, replace credentials and use `https://api-m.paypal.com`.

## Private eBook delivery

Files are never placed under `public/`; they live in the private R2 bucket bound as `EBOOKS`, keyed by stable catalog keys, e.g. `book-deep-work.pdf`. Do not enable public access or an `r2.dev` domain on that bucket. The download route verifies a signed expiring token, a paid order, a live entitlement, and a per-order rate limit (10 downloads per 15 minutes, counted from `download_logs` in D1) before streaming the object from R2 as an attachment.

Refund and dispute webhooks mark the order and revoke its active entitlements. D1 has no interactive transactions or row locks, so fulfillment runs as one atomic `db.batch`: a conditional status update (only `pending`, `failed` or `cancelled` orders can become paid) decides which concurrent webhook wins and sends the email, while the payment upsert and the unique `(order, ebook key)` constraint keep retries idempotent. A late payment webhook never reopens a refunded or disputed order.

## Email

Create a Resend API key, verify the sending domain, and set `RESEND_API_KEY` and `EMAIL_FROM`. Successful fulfillment sends the receipt and a seven-day signed library link. If email is not configured, checkout and fulfillment still work, but no message is sent.

## Admin access

Register normally, then promote the intended operator directly from a trusted console:

`npx cf d1 query <database-id> --sql "UPDATE users SET role = 'admin' WHERE email = 'owner@example.com'"`

The `/admin` area and subpages verify the server-side session role and are excluded from indexing.

## Production checklist

- Set a strong, unique `DOWNLOAD_TOKEN_SECRET` and HTTPS canonical URL.
- Use live payment keys only in the production secret manager.
- Confirm webhook signatures and event subscriptions in both providers.
- Confirm D1 Time Travel (point-in-time recovery) covers your retention needs and export backups regularly.
- Keep the R2 bucket private, and scan uploads for malware before adding them.
- Password hashing (bcrypt, cost 12) runs in the Worker and needs far more CPU time than the Workers Free plan's 10 ms per request; use the Workers Paid plan.
- Add jurisdiction-specific tax calculation and legal copy before launch.
- Run `npm run lint`, `npm run typecheck`, and `npm run build` in CI.
- Rotate provider and email credentials periodically and review payment/audit logs.

## Security model

Raw card data never reaches Folio. Pending orders grant no access. Stripe fulfillment occurs after signed webhook verification; PayPal capture and webhook verification happen server-side. Historical line-item names and prices are preserved. Bundles remain order items while entitlements expand exactly once to every included eBook. Guest links are HMAC-signed and expiring; registered libraries issue fresh short-lived links. Passwords use bcrypt and session cookies are HTTP-only, same-site, and secure in production.
