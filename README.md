# Folio Digital Bookshop

A full-stack Next.js App Router eBook shop using PostgreSQL, Drizzle ORM, Stripe Checkout, PayPal Orders, private downloads, transactional email, and role-protected administration.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `DOWNLOAD_TOKEN_SECRET`.
2. Install dependencies with `npm install`.
3. Apply the schema with `npx drizzle-kit push`.
4. Run `npm run dev` and open `http://localhost:3000`.

The storefront demonstration catalog lives in `src/lib/catalog.ts`; all checkout prices are rebuilt from this server-owned catalog. The PostgreSQL schema is ready for replacing those records with admin-managed catalog queries.

## Stripe sandbox

Create a Stripe account, copy an `sk_test_...` key to `STRIPE_SECRET_KEY`, and forward test events:

`stripe listen --forward-to localhost:3000/api/webhooks/stripe`

Copy the returned `whsec_...` to `STRIPE_WEBHOOK_SECRET`. Subscribe production webhooks to `https://your-domain/api/webhooks/stripe`. Required events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, and `charge.dispute.created`. Use Stripe test card `4242 4242 4242 4242` with any future expiry and CVC.

## PayPal sandbox

Create a REST app in the PayPal Developer Dashboard. Set its sandbox client ID and secret, leave `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`, create a webhook pointing to `/api/webhooks/paypal`, and copy its ID to `PAYPAL_WEBHOOK_ID`. Subscribe to `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, and `CUSTOMER.DISPUTE.CREATED`. For production, replace credentials and use `https://api-m.paypal.com`.

## Private eBook delivery

Files are never placed under `public/`. Mount a private directory and set `PRIVATE_EBOOK_DIR`. Demonstration file names use stable catalog keys, e.g. `book-deep-work.pdf`. The download route verifies a signed expiring token, a paid order, a live entitlement, and a per-order rate limit before streaming an attachment. In a cloud deployment, replace the final filesystem read with a private S3/R2/GCS `GetObject` or short-lived signed URL while keeping the same entitlement checks.

Refund and dispute webhooks mark the order and revoke its active entitlements. Webhook fulfillment uses a unique `(order, ebook key)` constraint and row lock to remain idempotent.

## Email

Create a Resend API key, verify the sending domain, and set `RESEND_API_KEY` and `EMAIL_FROM`. Successful fulfillment sends the receipt and a seven-day signed library link. If email is not configured, checkout and fulfillment still work, but no message is sent.

## Admin access

Register normally, then promote the intended operator directly from a trusted database console:

`UPDATE users SET role = 'admin' WHERE email = 'owner@example.com';`

The `/admin` area and subpages verify the server-side session role and are excluded from indexing.

## Production checklist

- Set a strong, unique `DOWNLOAD_TOKEN_SECRET` and HTTPS canonical URL.
- Use live payment keys only in the production secret manager.
- Confirm webhook signatures and event subscriptions in both providers.
- Use managed PostgreSQL with point-in-time recovery and encrypted daily backups.
- Store eBooks in private object storage with versioning and malware-scanned uploads.
- Configure a durable distributed rate limiter (Redis/Upstash) for multi-instance deployments.
- Add jurisdiction-specific tax calculation and legal copy before launch.
- Run `npx next typegen`, `npm exec tsc -- --noEmit`, and `npm run build` in CI.
- Rotate provider and email credentials periodically and review payment/audit logs.

## Security model

Raw card data never reaches Folio. Pending orders grant no access. Stripe fulfillment occurs after signed webhook verification; PayPal capture and webhook verification happen server-side. Historical line-item names and prices are preserved. Bundles remain order items while entitlements expand exactly once to every included eBook. Guest links are HMAC-signed and expiring; registered libraries issue fresh short-lived links. Passwords use bcrypt and session cookies are HTTP-only, same-site, and secure in production.
