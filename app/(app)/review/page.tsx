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

function label(date: string, withYear = true) {
  return parseEntryDate(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  })
}

function weekPeriod(start: string, end: string) {
  const from = parseEntryDate(start)
  const to = parseEntryDate(end)
  const sameYear = from.getFullYear() === to.getFullYear()
  const sameMonth = sameYear && from.getMonth() === to.getMonth()
  const year = to.getFullYear()
  const startMonth = from.toLocaleDateString("en-US", { month: "short" })
  const endMonth = to.toLocaleDateString("en-US", { month: "short" })
  if (sameMonth) {
    return `${startMonth} ${from.getDate()} – ${to.getDate()}, ${year}`
  }
  if (sameYear) {
    return `${startMonth} ${from.getDate()} – ${endMonth} ${to.getDate()}, ${year}`
  }
  return `${label(start)} – ${label(end)}`
}

export default function ReviewPage() {
  const state = useAppState()
  const { status, user } = useAuth()
  const [offset, setOffset] = useState(0)
  const end = shiftKey(getTodayKey(), offset * 7)
  const start = shiftKey(end, -6)
  const excerpts = reviewExcerpts(state.entries, end)
  const period = weekPeriod(start, end)
  return (
    <AppScreenShell
      title="Week in review"
      description="Revisit what mattered and choose something to carry forward."
      railTitle="A little perspective."
      railBody="Your words and the things you chose to record. Missing days stay blank; there’s nothing to make up."
      contentClassName="lg:max-w-4xl"
    >
      <div className="mb-6 flex items-center justify-between gap-2">
        <button
          aria-label="Previous week"
          onClick={() => setOffset((value) => value - 1)}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted"
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
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
        >
          <ArrowRight className="size-5" />
        </button>
      </div>
      <WeeklyReflection
        entries={state.entries}
        habits={state.habits}
        todayKey={end}
      />
      <section className="mt-6 mb-5" aria-labelledby="week-words">
        {excerpts.length ? (
          <>
            <h2
              id="week-words"
              className="text-xs font-medium text-muted-foreground"
            >
              In your own words
            </h2>
            <div className="mt-4 space-y-3">
              {excerpts.map((item, index) => (
                <Link
                  href={`/timeline/#day-${item.date}`}
                  key={`${item.date}-${index}`}
                  className="block py-3 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="text-xs text-muted-foreground">
                    {label(item.date, false)} · {item.kind}
                  </span>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 break-words whitespace-pre-wrap">
                    {item.text}
                  </p>
                  <span className="sr-only">Read this day</span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <p
            id="week-words"
            className="text-sm leading-6 text-muted-foreground"
          >
            No written entries in this week yet.{" "}
            <Link href="/app" className="underline">
              Write on Today
            </Link>
          </p>
        )}
      </section>
      <section aria-label="Reflect on the week">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Next week
        </p>
        <JournalComposer
          key={`${status}:${user?.id ?? "guest"}:${end}`}
          ready={status !== "loading"}
          signedIn={status === "authed"}
          reviewPeriod={period}
          reviewWeekEnd={end}
        />
      </section>
    </AppScreenShell>
  )
}
