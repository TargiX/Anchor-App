"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import Link from "next/link"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"

/**
 * Route-level error boundary. Catches render/runtime errors in any page
 * segment and offers recovery instead of a blank crash. When Sentry is
 * wired this is the natural place to report `error` (incl. `error.digest`).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to Sentry (no-op when no DSN is configured), keep the dev log.
    Sentry.captureException(error)
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <AnchorMotif size={96} className="text-primary opacity-80" />
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Something broke
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
          We lost the thread for a moment
        </h1>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          An unexpected error interrupted this screen. Your saved data is safe.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} className="rounded-2xl">
          Try again
        </Button>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/app">Back to app</Link>
        </Button>
      </div>
    </div>
  )
}
