import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry init. Next.js 16 auto-loads this via the
 * instrumentation-client hook (runs once in the browser before hydration).
 *
 * Inert without a DSN: the SDK stays uninitialized so local dev, previews, and
 * forks without a Sentry project pay zero runtime cost and send nothing. Set
 * NEXT_PUBLIC_SENTRY_DSN in the Vercel project environment to enable.
 */
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // More coverage while building confidence, back off in production.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}

// Instrument client-side route transitions for navigation breadcrumbs/timing.
// Stable regardless of init state; no-op when Sentry is unconfigured.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
