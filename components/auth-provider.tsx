"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client"
import { setStorageScope } from "@/lib/store/store"

/**
 * Auth state machine:
 *  - "unconfigured": no Supabase env → app runs local-only, routes are open.
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
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? "loading" : "unconfigured"
  )
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!supabase) {
      setStorageScope(null)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      const nextUser = data.session?.user ?? null
      setUser(nextUser)
      setStatus(nextUser ? "authed" : "anon")
      setStorageScope(nextUser ? `user:${nextUser.id}` : "anon")
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setStatus(nextUser ? "authed" : "anon")
      setStorageScope(nextUser ? `user:${nextUser.id}` : "anon")
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthValue = {
    status,
    user,
    async signIn(email, password) {
      if (!supabase) return { error: "Accounts are not configured." }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error: error?.message ?? null }
    },
    async signUp(email, password) {
      if (!supabase)
        return {
          error: "Accounts are not configured.",
          needsConfirmation: false,
        }
      const { data, error } = await supabase.auth.signUp({ email, password })
      // If email confirmation is on, there's no active session yet.
      return {
        error: error?.message ?? null,
        needsConfirmation: !error && !data.session,
      }
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
