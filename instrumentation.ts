import * as Sentry from "@sentry/nextjs";

/**
 * Server-side SDK registration. The Next.js instrumentation hook runs this once
 * per runtime (Node.js or Edge) before requests are handled. Client-side init
 * lives in instrumentation-client.ts; server/edge configs live alongside.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture errors thrown in Server Components, Route Handlers, Server Actions,
// middleware, and next/headers usage. Inert when SENTRY_DSN is unset.
export const onRequestError = Sentry.captureRequestError;
