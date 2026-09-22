"use client"

import Link from "next/link"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"

export default function OfflinePage() {
  return (
    <main className="flex min-h-app flex-col items-center justify-center gap-6 px-6 text-center">
      <AnchorMotif size={96} className="text-primary opacity-80" />
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Offline</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
          You&apos;re still here
        </h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Your journal on this device is still here. Reconnect when you want to
          sync.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()} className="rounded-2xl">
          Try again
        </Button>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/app">Open the journal</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  )
}
