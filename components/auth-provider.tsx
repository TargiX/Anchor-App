"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {
  apiFetch,
  isBackendConfigured,
  isNativePlatform,
  setSessionToken,
} from "@/lib/backend/client"
import {
  captureEvent,
  identifyUser,
  resetAnalyticsUser,
} from "@/lib/analytics/client"
import {
  classifySessionResponse,
  forgetRememberedUser,
  nextAuthSnapshot,
  readRememberedUser,
  rememberUser,
  type SessionEnd,
} from "@/lib/auth/session"
import { localStorageAdapter } from "@/lib/store/persistence"

/**
 * Auth state machine:
 *  - "unconfigured": no backend reachable → local development fallback.
 *  - "loading": resolving the initial session.
 *  - "authed" / "anon": signed in / not.
 *
 * An unreachable backend never signs anyone out: see lib/auth/session.
 */
export type AuthStatus = "unconfigured" | "loading" | "authed" | "anon"

export interface User {
  id: string
  email?: string | null
  name?: string | null
}

interface SessionResponse {
  user?: User | null
  session?: { token?: string | null } | null
}

interface AuthValue {
  status: AuthStatus
  user: User | null
  /** Why the last session ended; only "sign-out" may delete local data. */
  endedBy: SessionEnd | null
  googleEnabled: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>
  resendConfirmation: (email: string) => Promise<{ error: string | null }>
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>
  resetPassword: (
    token: string,
    password: string
  ) => Promise<{ error: string | null }>
  deleteAccount: (password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

const GOOGLE_DISABLED_ERROR = "Google sign-in is not available yet."

async function captureTokenFromResponse(res: Response): Promise<void> {
  if (!isNativePlatform) return
  const headerToken =
    res.headers.get("set-auth-token") ?? res.headers.get("x-better-auth-token")
  if (headerToken) {
    await setSessionToken(headerToken)
    return
  }
  try {
    const body = (await res.clone().json()) as {
      token?: string
      session?: { token?: string }
    }
    const token = body?.token ?? body?.session?.token
    if (typeof token === "string" && token.length > 0) {
      await setSessionToken(token)
    }
  } catch {
    // Body was not JSON; nothing to capture.
  }
}

function readErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback
  const candidate = payload as { message?: unknown; error?: unknown }
  if (typeof candidate.message === "string" && candidate.message.length > 0) {
    return candidate.message
  }
  if (typeof candidate.error === "string" && candidate.error.length > 0) {
    return candidate.error
  }
  return fallback
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<{
    status: AuthStatus
    user: User | null
    endedBy: SessionEnd | null
  }>({
    status: isBackendConfigured ? "loading" : "unconfigured",
    user: null,
    endedBy: null,
  })
  const { status, user, endedBy } = auth
  const [googleEnabled] = useState(false)

  function enterAccount(nextUser: User) {
    rememberUser(localStorageAdapter, nextUser)
    setAuth({ status: "authed", user: nextUser, endedBy: null })
    identifyUser(nextUser.id)
  }

  function leaveAccount() {
    forgetRememberedUser(localStorageAdapter)
    setAuth({ status: "anon", user: null, endedBy: "sign-out" })
    resetAnalyticsUser()
  }

  useEffect(() => {
    if (!isBackendConfigured) return

    let cancelled = false

    async function loadSession() {
      let res: Response | null = null
      let body: unknown = undefined
      try {
        res = await apiFetch("/api/auth/get-session", {
          method: "GET",
          cache: "no-store",
        })
        if (res.ok) {
          await captureTokenFromResponse(res)
          body = await res.json().catch(() => undefined)
        }
      } catch {
        res = null
      }
      if (cancelled) return

      const check = classifySessionResponse(res, body)
      if (check.kind === "authed") {
        rememberUser(localStorageAdapter, check.user)
        identifyUser(check.user.id)
      } else if (check.kind === "signed-out") {
        forgetRememberedUser(localStorageAdapter)
      }
      setAuth((current) =>
        current.status === "unconfigured"
          ? current
          : nextAuthSnapshot(
              { ...current, status: current.status },
              check,
              readRememberedUser(localStorageAdapter)
            )
      )
    }

    void loadSession()

    const onFocus = () => {
      if (!cancelled) void loadSession()
    }
    window.addEventListener("focus", onFocus)

    return () => {
      cancelled = true
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  const value: AuthValue = {
    status,
    user,
    endedBy,
    googleEnabled,
    async signIn(email, password) {
      if (!isBackendConfigured)
        return { error: "Accounts are not configured yet." }
      try {
        const res = await apiFetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        await captureTokenFromResponse(res)
        const data = await res.json().catch(() => null)
        if (!res.ok) return { error: readErrorMessage(data, "Sign-in failed.") }
        const nextUser = (data as SessionResponse | null)?.user ?? null
        if (nextUser?.id) {
          enterAccount(nextUser)
          captureEvent("account_signed_in", { method: "email" })
        }
        return { error: null }
      } catch {
        return { error: "Sign-in failed. Check your connection and try again." }
      }
    },
    async signInWithGoogle() {
      captureEvent("account_oauth_attempted", { provider: "google" })
      return { error: GOOGLE_DISABLED_ERROR }
    },
    async signUp(email, password) {
      if (!isBackendConfigured) {
        return {
          error: "Accounts are not configured yet.",
          needsConfirmation: false,
        }
      }
      try {
        const res = await apiFetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, name: email }),
        })
        await captureTokenFromResponse(res)
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          return {
            error: readErrorMessage(data, "Sign-up failed."),
            needsConfirmation: false,
          }
        }
        const nextUser = (data as SessionResponse | null)?.user ?? null
        if (nextUser?.id) {
          enterAccount(nextUser)
          captureEvent("account_signed_up", {
            method: "email",
            needs_confirmation: false,
          })
        }
        return { error: null, needsConfirmation: false }
      } catch {
        return {
          error: "Sign-up failed. Check your connection and try again.",
          needsConfirmation: false,
        }
      }
    },
    async resendConfirmation() {
      // Verification is intentionally disabled for v1; keep the signature so
      // the login page's resend flow renders an honest no-op.
      captureEvent("account_resend_confirmation_noop")
      return { error: null }
    },
    async requestPasswordReset(email) {
      if (!isBackendConfigured)
        return { error: "Accounts are not configured yet." }
      try {
        const res = await apiFetch("/api/auth/request-password-reset", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            redirectTo: `${window.location.origin}/reset-password`,
          }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok)
          return {
            error: readErrorMessage(data, "Could not send reset email."),
          }
        return { error: null }
      } catch {
        return { error: "Could not send reset email. Check your connection." }
      }
    },
    async resetPassword(token, password) {
      if (!isBackendConfigured)
        return { error: "Accounts are not configured yet." }
      try {
        const res = await apiFetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, newPassword: password }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok)
          return {
            error: readErrorMessage(
              data,
              "This reset link is invalid or expired."
            ),
          }
        return { error: null }
      } catch {
        return { error: "Reset failed. Check your connection and try again." }
      }
    },
    async deleteAccount(password) {
      if (!isBackendConfigured)
        return { error: "Accounts are not configured yet." }
      try {
        const res = await apiFetch("/api/auth/delete-user", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok)
          return {
            error: readErrorMessage(data, "Could not delete the account."),
          }
        await setSessionToken(null)
        leaveAccount()
        return { error: null }
      } catch {
        return { error: "Could not delete the account. Check your connection." }
      }
    },
    async signOut() {
      captureEvent("account_signed_out")
      try {
        await apiFetch("/api/auth/sign-out", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        })
      } catch {
        // Best effort: clear local state regardless.
      }
      await setSessionToken(null)
      leaveAccount()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}
