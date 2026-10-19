import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "folio-bookshop",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-19",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      // Orders, accounts, entitlements; schema in src/db/schema.ts, migrations in ./migrations
      DB: bindings.d1({ name: "folio-db" }),
      // Private eBook files, keyed `${catalogKey}.pdf`; never served publicly
      EBOOKS: bindings.r2({ name: "folio-ebooks" }),
      // Only declared bindings reach the Worker (env and process.env). Locally they are
      // read from .env; in production set them as Worker secrets.
      DOWNLOAD_TOKEN_SECRET: bindings.secret(),
      STRIPE_SECRET_KEY: bindings.secret(),
      STRIPE_WEBHOOK_SECRET: bindings.secret(),
      PAYPAL_CLIENT_ID: bindings.secret(),
      PAYPAL_CLIENT_SECRET: bindings.secret(),
      PAYPAL_WEBHOOK_ID: bindings.secret(),
      RESEND_API_KEY: bindings.secret(),
      EMAIL_FROM: bindings.secret(),
      // Production PayPal is https://api-m.paypal.com
      PAYPAL_API_BASE: bindings.text("https://api-m.sandbox.paypal.com"),
    },
  }),
});
