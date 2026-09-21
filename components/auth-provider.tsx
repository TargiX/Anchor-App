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

/**
 * Auth state machine:
 *  - "unconfigured": no backend reachable → local development fallback.
 *  - "loading": resolving the initial session.
 *  - "authed" / "anon": signed in / not.
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
  const [status, setStatus] = useState<AuthStatus>(
    isBackendConfigured ? "loading" : "unconfigured"
  )
  const [user, setUser] = useState<User | null>(null)
  const [googleEnabled] = useState(false)

  useEffect(() => {
    if (!isBackendConfigured) return

    let cancelled = false

    async function loadSession() {
      try {
        const res = await apiFetch("/api/auth/get-session", {
          method: "GET",
          cache: "no-store",
        })
        if (cancelled) return
        if (!res.ok) {
          setStatus("anon")
          setUser(null)
          return
        }
        await captureTokenFromResponse(res)
        const data = (await res.json().catch(() => null)) as SessionResponse | null
        if (cancelled) return
        const nextUser = data?.user ?? null
        setUser(nextUser)
        setStatus(nextUser ? "authed" : "anon")
        if (nextUser?.id) identifyUser(nextUser.id)
      } catch {
        if (!cancelled) {
          setStatus("anon")
          setUser(null)
        }
      }
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
    googleEnabled,
    async signIn(email, password) {
      if (!isBackendConfigured) return { error: "Accounts are not configured yet." }
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
          identifyUser(nextUser.id)
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
          identifyUser(nextUser.id)
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
          return { error: readErrorMessage(data, "Could not send reset email.") }
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
        setUser(null)
        setStatus("anon")
        resetAnalyticsUser()
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
      setUser(null)
      setStatus("anon")
      resetAnalyticsUser()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}
