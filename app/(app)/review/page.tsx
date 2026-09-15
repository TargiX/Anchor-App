"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { AppScreenShell } from "@/components/app-screen-shell"
import { WeeklyReflection } from "@/components/timeline-view"
import { JournalComposer } from "@/components/journal-composer"
import { useAppState } from "@/hooks/use-store"
import { reviewExcerpts } from "@/lib/domain/journal"
import { getTodayKey, parseEntryDate, shiftKey } from "@/lib/time/today"

function label(date: string) {
  return parseEntryDate(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function ReviewPage() {
  const state = useAppState()
  const { status, user } = useAuth()
  const [offset, setOffset] = useState(0)
  const end = shiftKey(getTodayKey(), offset * 7)
  const start = shiftKey(end, -6)
  const excerpts = reviewExcerpts(state.entries, end)
  const period = `${label(start)} – ${label(end)}`
  return (
    <AppScreenShell
      title="Week in review"
      eyebrow="Make sense of your days"
      description="Revisit what mattered and choose something to carry forward."
      railTitle="A little perspective."
      railBody="Your words and the things you chose to record. Missing days stay blank; there’s nothing to make up."
      contentClassName="lg:max-w-4xl"
    >
      <div className="mb-6 flex items-center justify-between gap-2">
        <button
          aria-label="Previous week"
          onClick={() => setOffset((value) => value - 1)}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border"
        >
          <ArrowLeft className="size-5" />
        </button>
        <p aria-live="polite" className="text-center text-sm">
          {period}
        </p>
        <button
          aria-label="Next week"
          disabled={offset === 0}
          onClick={() => setOffset((value) => Math.min(0, value + 1))}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border disabled:opacity-30"
        >
          <ArrowRight className="size-5" />
        </button>
      </div>
      <WeeklyReflection
        entries={state.entries}
        habits={state.habits}
        todayKey={end}
      />
      <section className="my-8" aria-labelledby="week-words">
        <h2
          id="week-words"
          className="font-[family-name:var(--font-display)] text-3xl"
        >
          In your own words
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          What feels worth keeping? Open a moment to read the whole day.
        </p>
        {excerpts.length ? (
          <div className="mt-5 space-y-3">
            {excerpts.map((item, index) => (
              <Link
                href={`/timeline/#day-${item.date}`}
                key={`${item.date}-${index}`}
                className="block rounded-2xl border border-border bg-card p-5 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="text-xs text-muted-foreground">
                  {label(item.date)} · {item.kind}
                </span>
                <p className="mt-2 line-clamp-3 text-sm leading-6 break-words whitespace-pre-wrap">
                  {item.text}
                </p>
                <span className="mt-3 inline-flex items-center gap-2 text-xs text-primary">
                  Read this day <ArrowRight className="size-3" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-border p-6">
            <p className="text-sm text-muted-foreground">
              No written entries in this week yet. A thought, a good moment or
              an evening reflection is enough to start.
            </p>
            <Link
              href="/app"
              className="mt-3 inline-flex min-h-11 items-center text-sm underline"
            >
              Write on Today
            </Link>
          </div>
        )}
      </section>
      <section aria-label="Reflect on the week">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl">
          Carry something forward
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Your reflection is saved in today’s journal with the dates of this
          week.
        </p>
        <JournalComposer
          key={`${status}:${user?.id ?? "guest"}:${end}`}
          ready={status !== "loading"}
          signedIn={status === "authed"}
          reviewPeriod={period}
        />
      </section>
    </AppScreenShell>
  )
}
