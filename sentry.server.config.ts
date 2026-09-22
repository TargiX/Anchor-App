import * as Sentry from "@sentry/nextjs"

/**
 * Server-side Sentry init. Runs only from instrumentation.ts register() and
 * only when SENTRY_DSN is set — without a DSN this file is never imported.
 * Journal app: no PII, no request bodies, no traces.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend(event) {
    if (event.request) {
      delete event.request.data
      delete event.request.cookies
    }
    if (event.user) event.user = {}
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.filter(
        (crumb) => crumb.category !== "console"
      )
    }
    return event
  },
})
