import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-app max-w-2xl flex-col px-6 py-8 text-foreground">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-8 min-h-11 w-fit rounded-xl"
      >
        <Link
          href={
            process.env.NEXT_PUBLIC_NATIVE_BUILD === "true" ? "/settings" : "/"
          }
          aria-label={
            process.env.NEXT_PUBLIC_NATIVE_BUILD === "true"
              ? "Back to settings"
              : "Back"
          }
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </Button>

      <div className="mb-8 flex items-center gap-3">
        <AnchorMotif size={32} className="text-primary" />
        <div>
          <p className="text-xs font-medium text-muted-foreground">Anchor</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Privacy Policy
          </h1>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-7 text-muted-foreground">
        <p>Last updated: August 23, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            Local-first data
          </h2>
          <p>
            Anchor stores your journal notes, mood, habits, settings, and
            reminders locally on your device by default. The app is designed to
            work without an account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            Journal and free-form text
          </h2>
          <p>
            Morning intentions and evening journal entries are private personal
            notes. Do not enter emergency, medical, or highly sensitive
            information. Anchor is not a medical service and does not provide
            diagnosis, treatment, or clinical advice.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            Notifications
          </h2>
          <p>
            If you enable reminders, Anchor asks your device or browser for
            notification permission and schedules local reminders. You can
            disable notifications in browser, iOS, or system settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            Optional accounts and sync
          </h2>
          <p>
            Anchor may support optional account-based sync in future beta
            builds. If enabled, account and sync data will only be used to
            provide the service and will be disclosed in this policy before
            public release.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            Analytics and crash reporting
          </h2>
          <p>
            On the website, self-hosted Umami measures page visits using general
            page categories, referral websites, browser language, and screen size.
            We do not send account identifiers, journal text, intentions, voice
            transcripts, check-in content, or URL query parameters. Session replay
            is disabled. Do Not Track and Global Privacy Control are respected.
            This website tracker does not run in the native app. Anchor does not
            sell personal data or track you across unrelated apps and websites.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">Contact</h2>
          <p>
            For privacy or support questions, use the contact details on the{" "}
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
