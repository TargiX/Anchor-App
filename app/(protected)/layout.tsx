"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { AnchorMotif } from "@/components/anchor-motif"

/**
 * Guard for the app routes. When Supabase is configured, an unauthenticated
 * visitor is redirected to /login. When it's not configured, the app runs
 * fully local and the gate is transparent.
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === "anon") router.replace("/login")
  }, [status, router])

  if (status === "loading" || status === "anon") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <AnchorMotif size={88} className="animate-pulse text-primary opacity-60" />
      </div>
    )
  }

  // "authed" or "unconfigured" → render the app.
  return <>{children}</>
}
