"use client"

import Link from "next/link"
import { Anchor, Settings } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { JournalNote } from "@/components/journal-note"
import { JournalComposer } from "@/components/journal-composer"
import { DailyPaths } from "@/components/daily-paths"
import { SyncStatusIndicator } from "@/components/sync-status-indicator"
import { WeeklyDirectionCard } from "@/components/weekly-direction-card"
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
    <main className="mx-auto min-h-app max-w-2xl px-5 pt-6 pb-8 sm:px-8">
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
            href="/settings"
            aria-label="Settings"
            className="flex size-11 items-center justify-center rounded-xl hover:bg-muted"
          >
            <Settings className="size-5" />
          </Link>
        </nav>
      </header>

      <section className="pt-6 pb-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
          Keep a little of today.
        </h1>
        {signedIn && (
          <div className="mt-2">
            <SyncStatusIndicator />
          </div>
        )}
      </section>

      <JournalComposer ready={ready} signedIn={signedIn} />

      <WeeklyDirectionCard />

      {today.intention && (
        <section aria-label="Your current anchor" className="mt-8">
          <p className="text-xs font-medium text-muted-foreground">
            Today&apos;s focus
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-4">
            <p className="min-w-0 font-[family-name:var(--font-display)] text-lg leading-snug [overflow-wrap:anywhere]">
              {today.intention}
            </p>
            <Link
              href="/focus"
              className="inline-flex min-h-11 shrink-0 items-center text-sm text-muted-foreground"
            >
              Pause
            </Link>
          </div>
        </section>
      )}

      {Boolean(today.quickCheckIns?.length) && (
        <section aria-label="Today's notes" className="mt-8">
          <h2 className="text-xs font-medium text-muted-foreground">
            Today&apos;s notes
          </h2>
          <div className="mt-3 space-y-3">
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
                    favorite={checkIn.favorite}
                    photo={checkIn.photo}
                    hideNextStep
                  />
                </article>
              ))}
          </div>
        </section>
      )}

      <DailyPaths entry={today} />
    </main>
  )
}
