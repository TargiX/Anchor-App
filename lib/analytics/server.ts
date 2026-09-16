import { PostHog } from "posthog-node"

let client: PostHog | null | undefined

export function getPostHogServerClient(): PostHog | null {
  if (client !== undefined) return client

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!token || !host) {
    client = null
    return client
  }

  client = new PostHog(token, { host, flushAt: 1, flushInterval: 0 })
  return client
}

export function postHogRequestContext(request: Request, fallbackId: string) {
  return {
    distinctId:
      request.headers.get("x-posthog-distinct-id")?.trim() || fallbackId,
    sessionId: request.headers.get("x-posthog-session-id")?.trim() || undefined,
  }
}
