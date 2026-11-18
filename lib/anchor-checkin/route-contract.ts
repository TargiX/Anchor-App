import type { CheckInKind } from "./checkin"
import type { listCheckIns } from "./storage"

/**
 * Backend base URL that the check-in API may forward session checks to.
 *
 * Only `https:` URLs and loopback HTTP (`localhost` / `127.0.0.1`) are
 * accepted so a misconfigured env var cannot leak session cookies to an
 * arbitrary host. Trailing slashes are stripped; anything invalid resolves
 * to `undefined`, which keeps the documented local-only fallback active.
 */
export function resolveBackendUrl(): string | undefined {
  const url = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL
  if (!url) return undefined
  try {
    return new URL(url).protocol === "https:" ||
      new URL(url).hostname === "localhost" ||
      new URL(url).hostname === "127.0.0.1"
      ? url.replace(/\/+$/, "")
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Storage directory scoped to one authenticated user. The id is reduced to
 * `[a-zA-Z0-9_-]` so a hostile session id cannot traverse out of
 * `data/anchor-checkins` via path separators.
 */
export function storageOptionsForUser(userId: string | null) {
  if (!userId) return undefined

  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_")
  return { dir: `data/anchor-checkins/${safeUserId}` }
}

/** Accept only the check-in kinds the voice flow supports; ignore the rest. */
export function parseKind(kind: unknown): CheckInKind | undefined {
  if (kind === "morning" || kind === "evening" || kind === "spontaneous")
    return kind
  return undefined
}

/**
 * The most recent morning intention across stored check-ins, used as the
 * pairing context for the next check-in. Records arrive oldest-first, so the
 * scan runs from the end and skips morning entries without a main intention.
 */
export function latestMorningIntention(
  records: Awaited<ReturnType<typeof listCheckIns>>
): string | null {
  return (
    [...records]
      .reverse()
      .find((record) => record.kind === "morning" && record.intention.main)
      ?.intention.main ?? null
  )
}
