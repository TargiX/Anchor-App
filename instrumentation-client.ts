import posthog from "posthog-js"

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (token && host) {
  posthog.init(token, {
    api_host: host,
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
