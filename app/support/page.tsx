import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"

const feedbackPoints = [
  "Which flow you tested: web, PWA, or TestFlight.",
  "What you expected to happen.",
  "What actually happened.",
  "A screenshot or screen recording if it helps.",
]

export default function SupportPage() {
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
            Support
          </h1>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-7 text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            Beta support
          </h2>
          <p>
            Anchor is currently preparing for a Web/PWA release and iOS
            TestFlight beta. For support, feedback, or tester access, email the
            beta owner.
          </p>
          <a
            href="mailto:targix8@gmail.com?subject=Anchor%20beta%20feedback"
            className="inline-flex items-center gap-2 text-primary underline"
          >
            <Mail className="size-4" />
            targix8@gmail.com
          </a>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">
            Helpful details
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            {feedbackPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            Not medical advice
          </h2>
          <p>
            Anchor is a personal ritual and journaling app. It is not a medical,
            crisis, diagnosis, therapy, or treatment service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">Legal links</h2>
          <p>
            Read the{" "}
            <Link href="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-primary underline">
              Terms
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
