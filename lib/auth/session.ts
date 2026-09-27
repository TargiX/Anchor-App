import { z } from "zod"
import type { StoragePort } from "@/lib/store/persistence"

/**
 * Session-check policy. Pure + tested; AuthProvider wires it to the network.
 *
 * The distinction that matters for a journal: "the server says there is no
 * session" is a fact, "we could not reach the server" is not. Only facts may
 * move a signed-in user out of their account, and only an explicit sign-out
 * may delete their local copy.
 */

export const SessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().nullish(),
  name: z.string().nullish(),
})

export type SessionUser = z.infer<typeof SessionUserSchema>

export type SessionCheck =
  | { kind: "authed"; user: SessionUser }
  | { kind: "signed-out" }
  | { kind: "unverified" }

/**
 * Classify a `get-session` response. `response: null` means the request
 * itself failed; `body: undefined` means an OK body was not JSON.
 */
export function classifySessionResponse(
  response: { ok: boolean; status: number } | null,
  body: unknown
): SessionCheck {
  if (!response) return { kind: "unverified" }
  if (response.ok) {
    if (body === undefined) return { kind: "unverified" }
    const user = (body as { user?: unknown } | null)?.user
    if (user === null || user === undefined) return { kind: "signed-out" }
    const parsed = SessionUserSchema.safeParse(user)
    return parsed.success
      ? { kind: "authed", user: parsed.data }
      : { kind: "unverified" }
  }
  // 401/403 are the server's answer. Everything else (5xx, 429, a proxy's
  // 502 while the backend restarts) says nothing about the session.
  if (response.status === 401 || response.status === 403) {
    return { kind: "signed-out" }
  }
  return { kind: "unverified" }
}

/** Why the last authed session ended; drives whether local data is wiped. */
export type SessionEnd = "sign-out" | "session-lost"

export type AuthPhase = "loading" | "authed" | "anon"

export interface AuthSnapshot {
  status: AuthPhase
  user: SessionUser | null
  endedBy: SessionEnd | null
}

/**
 * Next auth snapshot after a session check.
 * - verified user → authed
 * - confirmed no session → anon; if we were authed, the session was lost
 * - unverified → keep what we have; on a cold start fall back to the last
 *   verified user so an offline launch still opens their journal
 */
export function nextAuthSnapshot(
  current: AuthSnapshot,
  check: SessionCheck,
  rememberedUser: SessionUser | null
): AuthSnapshot {
  if (check.kind === "authed") {
    return { status: "authed", user: check.user, endedBy: null }
  }
  if (check.kind === "signed-out") {
    if (current.status === "anon") return current
    return {
      status: "anon",
      user: null,
      endedBy: current.status === "authed" ? "session-lost" : null,
    }
  }
  if (current.status !== "loading") return current
  return rememberedUser
    ? { status: "authed", user: rememberedUser, endedBy: null }
    : { status: "anon", user: null, endedBy: null }
}

/**
 * Local account data is deleted only when the user asked to leave. A lost
 * or unverifiable session keeps the per-user slot on disk: it stays out of
 * the guest view and merges back when the same account signs in again.
 */
export function shouldWipeAuthedData(endedBy: SessionEnd | null): boolean {
  return endedBy === "sign-out"
}

const LAST_USER_KEY = "anchor:last-session-user"

/** The last server-verified user; lets an offline cold start stay signed in. */
export function readRememberedUser(storage: StoragePort): SessionUser | null {
  const raw = storage.read(LAST_USER_KEY)
  if (!raw) return null
  try {
    const parsed = SessionUserSchema.safeParse(JSON.parse(raw))
    return parsed.success
      ? { id: parsed.data.id, email: parsed.data.email ?? null }
      : null
  } catch {
    return null
  }
}

export function rememberUser(storage: StoragePort, user: SessionUser): void {
  storage.write(
    LAST_USER_KEY,
    JSON.stringify({ id: user.id, email: user.email ?? null })
  )
}

export function forgetRememberedUser(storage: StoragePort): void {
  storage.remove(LAST_USER_KEY)
}
