"use client"

import Link from "next/link"
import { ArrowRight, Anchor, Settings } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { JournalNote } from "@/components/journal-note"
import { JournalComposer } from "@/components/journal-composer"
import { DailyPaths } from "@/components/daily-paths"
import { SyncStatusIndicator } from "@/components/sync-status-indicator"
import { useTodayEntry } from "@/hooks/use-store"

export default function Home() {
  const { status, user } = useAuth()
  // Remount the input on identity changes so private drafts never cross accounts.
  return (
    <Today
      key={`${status}:${user?.id ?? "guest"}`}
      ready={status !== "loading"}
      signedIn={status === "authed"}
    />
  )
}

function Today({ ready, signedIn }: { ready: boolean; signedIn: boolean }) {
  const today = useTodayEntry()

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex items-center justify-between">
        <Link
          href="/app"
          className="flex min-h-11 items-center gap-2 font-medium"
        >
          <Anchor className="size-5" />
          Anchor
        </Link>
        <nav aria-label="Main navigation" className="flex gap-2">
          <Link
            href={signedIn ? "/settings" : "/login"}
            aria-label={signedIn ? "Settings" : "Sign in for sync"}
            className="flex size-11 items-center justify-center rounded-xl hover:bg-muted"
          >
            <Settings className="size-5" />
          </Link>
        </nav>
      </header>

      <section className="pt-12 pb-8">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Today
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
          A day of your own.
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Notice how you feel, make room for what matters, and keep a little of
          today.
        </p>
        {signedIn && (
          <div className="mt-3">
            <SyncStatusIndicator />
          </div>
        )}
      </section>

      {today.intention && (
        <section
          aria-label="Your current anchor"
          className="mb-6 rounded-2xl border border-accent/30 bg-accent/5 p-5"
        >
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Your anchor today
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl [overflow-wrap:anywhere]">
            {today.intention}
          </p>
          <Link
            href="/focus"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"
          >
            Take a moment to reset <ArrowRight className="size-4" />
          </Link>
        </section>
      )}

      <DailyPaths entry={today} />

      <JournalComposer ready={ready} signedIn={signedIn} />

      {Boolean(today.quickCheckIns?.length) && (
        <section aria-label="Today's check-ins" className="mt-7">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            A little space for today
          </h2>
          <div className="mt-4 space-y-3">
            {today.quickCheckIns
              ?.slice()
              .reverse()
              .map((checkIn) => (
                <article
                  key={checkIn.id}
                  className="rounded-2xl border border-border p-4"
                >
                  <JournalNote
                    target={{ day: today.date, id: checkIn.id }}
                    text={{ note: checkIn.note, nextStep: checkIn.nextStep }}
                  />
                </article>
              ))}
          </div>
        </section>
      )}
      <Link
        href="/review"
        className="mt-8 flex min-h-16 items-center justify-between border-t border-border py-5"
      >
        <span>
          <span className="block font-medium">Your week, in perspective</span>
          <span className="text-sm text-muted-foreground">
            Revisit your words and choose what to carry forward.
          </span>
        </span>
        <ArrowRight className="ml-3 size-5 shrink-0" />
      </Link>
    </main>
  )
}
