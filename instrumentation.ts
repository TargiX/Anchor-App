import * as Sentry from "@sentry/nextjs"

/**
 * Server startup hook. Sentry stays inert unless SENTRY_DSN is configured —
 * without it nothing initializes and no events leave the process.
 * Dynamic imports are required here: the config module differs per runtime
 * (NEXT_RUNTIME), which is only known inside register().
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = Sentry.captureRequestError
