import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-8 text-foreground">
      <Link href="/" className="mb-8 inline-flex w-fit">
        <Button variant="ghost" size="sm" className="rounded-xl">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <AnchorMotif size={32} className="text-primary" />
        <div>
          <p className="text-xs tracking-widest text-muted-foreground uppercase">
            Anchor
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Terms
          </h1>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-7 text-muted-foreground">
        <p>Last updated: June 7, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            Beta software
          </h2>
          <p>
            Anchor is provided as beta software for personal journaling,
            reflection, and daily ritual tracking. Features may change while the
            beta is active.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            Personal use only
          </h2>
          <p>
            Use Anchor for your own routine and reflection. Do not rely on it as
            a medical, emergency, financial, legal, or professional advice
            service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            Your responsibility
          </h2>
          <p>
            You are responsible for the information you enter and for backing up
            data that matters to you. Local-first storage can be affected by
            browser, device, or app storage settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">Contact</h2>
          <p>
            For support, visit the{" "}
            <Link href="/support" className="text-primary underline">
              Support page
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
