import * as Sentry from "@sentry/nextjs";

/**
 * Node.js (server) runtime init, loaded by instrumentation.ts register().
 * Inert without SENTRY_DSN: nothing is sent, no background work runs.
 */
const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}
