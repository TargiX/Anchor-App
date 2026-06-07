"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client"

/**
 * Auth state machine:
 *  - "unconfigured": no Supabase env → local development fallback.
 *  - "loading": resolving the initial session.
 *  - "authed" / "anon": signed in / not.
 */
export type AuthStatus = "unconfigured" | "loading" | "authed" | "anon"

interface AuthValue {
  status: AuthStatus
  user: User | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>
  resendConfirmation: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? "loading" : "unconfigured"
  )
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setStatus(data.session ? "authed" : "anon")
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setStatus(session ? "authed" : "anon")
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthValue = {
    status,
    user,
    async signIn(email, password) {
      if (!supabase) return { error: "Accounts are not configured yet." }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error: error?.message ?? null }
    },
    async signUp(email, password) {
      if (!supabase)
        return {
          error: "Accounts are not configured yet.",
          needsConfirmation: false,
        }
      const emailRedirectTo = getAuthEmailRedirectTo()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      })
      // If email confirmation is on, there's no active session yet.
      return {
        error: error?.message ?? null,
        needsConfirmation: !error && !data.session,
      }
    },
    async resendConfirmation(email) {
      if (!supabase) return { error: "Accounts are not configured yet." }
      const emailRedirectTo = getAuthEmailRedirectTo()
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      })
      return { error: error?.message ?? null }
    },
    async signOut() {
      await supabase?.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}

function getAuthEmailRedirectTo(): string | undefined {
  if (typeof window === "undefined") return undefined
  return `${window.location.origin}/login?confirmed=1`
}
