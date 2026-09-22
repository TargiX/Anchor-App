"use client"

import { useEffect } from "react"
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
    console.error(error)
    // Dynamic import: keeps the Sentry SDK out of the client bundle entirely
    // when NEXT_PUBLIC_SENTRY_DSN is unset (incl. native static exports).
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import("@sentry/nextjs").then((Sentry) =>
        Sentry.captureException(error)
      )
    }
  }, [error])

  return (
    <div className="flex min-h-app flex-col items-center justify-center gap-6 px-6 text-center">
      <AnchorMotif size={96} className="text-primary opacity-80" />
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Error</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
          Something went wrong.
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
