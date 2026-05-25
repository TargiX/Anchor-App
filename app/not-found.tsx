import Link from "next/link"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <AnchorMotif size={96} className="text-primary opacity-80" />
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground">
          This page drifted off
        </h1>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          The page you&apos;re looking for isn&apos;t here. Let&apos;s get you back to solid ground.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/app">
          <Button className="rounded-2xl">Go to app</Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="rounded-2xl">
            Home
          </Button>
        </Link>
      </div>
    </div>
  )
}
