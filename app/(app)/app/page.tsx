"use client"

import Link from "next/link"
import { Anchor, Settings } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { JournalNote } from "@/components/journal-note"
import { JournalComposer } from "@/components/journal-composer"
import { DailyPaths } from "@/components/daily-paths"
import { SyncStatusIndicator } from "@/components/sync-status-indicator"
import { WeeklyDirectionCard } from "@/components/weekly-direction-card"
import { useAppState, useHydrated, useTodayEntry } from "@/hooks/use-store"
import { parseEntryDate } from "@/lib/time/today"
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
  const state = useAppState()
  const hydrated = useHydrated()
  // First run = nothing saved yet. The empty state is the onboarding:
  // date, one prompt, the composer. Everything else appears after the
  // first entry exists. Gate on hydration so saved users never see the
  // first-run copy for a frame.
  const firstRun = hydrated && Object.keys(state.entries).length === 0
  const dateLabel = parseEntryDate(today.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

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

      <section className="pt-8 pb-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-balance sm:text-4xl">
          {dateLabel}
        </h1>
        {!hydrated ? null : firstRun ? (
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Write one sentence about today. That&apos;s the whole ritual.
          </p>
        ) : signedIn ? (
          <div className="mt-2">
            <SyncStatusIndicator />
          </div>
        ) : null}
      </section>

      <JournalComposer ready={ready} signedIn={signedIn} />

      {firstRun ? null : (
        <>
          <WeeklyDirectionCard />

          {today.intention && (
            <section aria-label="Your current anchor" className="mt-10">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Focus
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-4">
                <p className="min-w-0 font-[family-name:var(--font-display)] text-xl leading-snug [overflow-wrap:anywhere]">
                  {today.intention}
                </p>
                <Link
                  href="/focus"
                  className="inline-flex min-h-11 shrink-0 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Pause
                </Link>
              </div>
            </section>
          )}

          {Boolean(today.quickCheckIns?.length) && (
            <section aria-label="Today's notes" className="mt-10">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Notes
              </h2>
              <div className="mt-1 divide-y divide-border/70">
                {today.quickCheckIns
                  ?.slice()
                  .reverse()
                  .map((checkIn) => (
                    <article key={checkIn.id} className="py-4">
                      <p className="mb-1.5 text-xs text-muted-foreground/80 tabular-nums">
                        {new Date(checkIn.createdAt).toLocaleTimeString(
                          "en-US",
                          { hour: "numeric", minute: "2-digit" }
                        )}
                      </p>
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
        </>
      )}
    </main>
  )
}
