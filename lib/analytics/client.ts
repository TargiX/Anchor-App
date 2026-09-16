"use client"

import posthog from "posthog-js"

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
  process.env.NEXT_PUBLIC_POSTHOG_HOST
)

export function captureEvent(
  event: string,
  properties?: Record<string, string | number | boolean | null>
) {
  if (isConfigured) posthog.capture(event, properties)
}

export function captureClientException(
  error: unknown,
  properties?: Record<string, string | number | boolean | null>
) {
  if (isConfigured) posthog.captureException(error, properties)
}

export function identifyUser(userId: string) {
  if (isConfigured) posthog.identify(userId)
}

export function resetAnalyticsUser() {
  if (isConfigured) posthog.reset()
}

export function getPostHogHeaders(): Record<string, string> {
  if (!isConfigured) return {}

  const sessionId = posthog.get_session_id()
  return {
    "X-POSTHOG-DISTINCT-ID": posthog.get_distinct_id(),
    ...(sessionId ? { "X-POSTHOG-SESSION-ID": sessionId } : {}),
  }
}
