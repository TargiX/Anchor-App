import * as Sentry from "@sentry/nextjs"
import posthog from "posthog-js"

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (token && host) {
  posthog.init(token, {
    api_host: host,
    autocapture: false,
    defaults: "2026-01-30",
    capture_exceptions: true,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: "identified_only",
    disable_session_recording: true,
    respect_dnt: true,
    debug: process.env.NODE_ENV === "development",
  })
} else if (process.env.NODE_ENV === "development") {
  for (const variable of [
    !token && "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN",
    !host && "NEXT_PUBLIC_POSTHOG_HOST",
  ].filter(Boolean)) {
    console.error(
      new Error(
        `${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`
      )
    )
  }
}

/**
 * Client-side Sentry init, gated on NEXT_PUBLIC_SENTRY_DSN. In native static
 * exports and DSN-less deployments the env inlines to undefined and nothing
 * initializes — zero overhead, zero network. Journal app: no PII, no request
 * bodies, no console breadcrumbs (they can carry journal text).
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
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
}
