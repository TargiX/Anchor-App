import Link from "next/link"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-app flex-col items-center justify-center gap-6 px-6 text-center">
      <AnchorMotif size={96} className="text-primary opacity-80" />
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">404</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
          This page isn&apos;t here.
        </h1>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          The address doesn&apos;t match anything in Anchor.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild className="rounded-2xl">
          <Link href="/app">Open the journal</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  )
}
