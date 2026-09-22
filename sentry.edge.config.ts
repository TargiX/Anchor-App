import * as Sentry from "@sentry/nextjs"

/** Edge-runtime twin of sentry.server.config.ts — same privacy posture. */
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
