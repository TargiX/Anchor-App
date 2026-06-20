import * as Sentry from "@sentry/nextjs";

/**
 * Edge runtime init, loaded by instrumentation.ts register() when running in
 * the Edge runtime (middleware, edge route handlers). Inert without SENTRY_DSN.
 */
const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}
