"use client"

import { useEffect, useState } from "react"
import { useAppState } from "@/hooks/use-store"
import { JournalNote } from "@/components/journal-note"
import { revealDayFragment } from "@/lib/ui/day-fragment"
import { matchesJournal } from "@/lib/domain/journal"
import { cn } from "@/lib/utils"
import { type DayEntry, type MoodPoint } from "@/lib/domain/entry"
import type { Habit } from "@/lib/domain/habit"
import {
  activeDays,
  averageSleepHours,
  moodDirection,
  topCompletedHabit,
  type MoodDirection,
  weeklyTrendSeries,
} from "@/lib/domain/reflection"
import { getTodayKey, parseEntryDate } from "@/lib/time/today"
import { ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

const MOOD_DIRECTION_COPY: Record<MoodDirection, string> = {
  rising: "Lifting",
  steady: "Holding steady",
  falling: "Trending lower",
}

export function WeeklyReflection({
  entries,
  habits,
  todayKey,
}: {
  entries: Record<string, DayEntry>
  habits: Habit[]
  todayKey: string
}) {
  const activity = activeDays(entries, todayKey)
  const mood = moodDirection(entries, todayKey)
  const sleep = averageSleepHours(entries, todayKey)
  const topHabit = topCompletedHabit(entries, habits, todayKey)
  const trend = weeklyTrendSeries(entries, todayKey)
  const hasSupportingMetrics =
    mood !== null || sleep !== null || topHabit !== null

  return (
    <section
      aria-labelledby="weekly-reflection-title"
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <h2
          id="weekly-reflection-title"
          className="font-[family-name:var(--font-display)] text-xl"
        >
          Your week
        </h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {activity.count} of {activity.of}
          </span>{" "}
          days recorded
        </p>
      </div>
      <div className="px-5 pb-4">
        {hasSupportingMetrics ? (
          <dl className="grid min-w-0 grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
            {mood !== null ? (
              <div className="min-w-0">
                <dt className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                  Mood direction
                </dt>
                <dd className="mt-2 font-[family-name:var(--font-display)] text-lg leading-6 text-foreground">
                  {MOOD_DIRECTION_COPY[mood]}
                </dd>
              </div>
            ) : null}
            {sleep !== null ? (
              <div className="min-w-0">
                <dt className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                  Average sleep
                </dt>
                <dd className="mt-2 font-[family-name:var(--font-display)] text-lg leading-6 text-foreground">
                  {sleep.toFixed(1)} hours
                </dd>
              </div>
            ) : null}
            {topHabit !== null ? (
              <div className="min-w-0">
                <dt className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                  Most repeated
                </dt>
                <dd className="mt-2 font-[family-name:var(--font-display)] text-lg leading-6 [overflow-wrap:anywhere] text-foreground">
                  {topHabit.name}
                </dd>
                <dd className="mt-1 text-sm text-muted-foreground">
                  {topHabit.count} {topHabit.count === 1 ? "time" : "times"}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Your notes are gathered below. Mood and sleep appear when recorded.
          </p>
        )}
      </div>
      {trend.some((point) => point.mood || point.sleepHours !== undefined) ? (
        <details className="border-t border-border">
          <summary className="min-h-11 cursor-pointer px-5 py-3 text-sm text-primary">
            Mood and sleep trends
          </summary>
          <WeeklyTrendChart trend={trend} />
        </details>
      ) : null}
    </section>
  )
}

type ChartCoordinate = { x: number; y: number }

function chartSegments(points: Array<ChartCoordinate | null>): string[] {
  const segments: string[] = []
  let segment: ChartCoordinate[] = []

  for (const point of points) {
    if (point) {
      segment.push(point)
      continue
    }
    if (segment.length > 1) {
      segments.push(segment.map(({ x, y }) => `${x},${y}`).join(" "))
    }
    segment = []
  }

  if (segment.length > 1) {
    segments.push(segment.map(({ x, y }) => `${x},${y}`).join(" "))
  }
  return segments
}

function WeeklyTrendChart({
  trend,
}: {
  trend: ReturnType<typeof weeklyTrendSeries>
}) {
  const chartHeight = 84
  const chartTop = 18
  const chartLeft = 24
  const chartWidth = 272
  const moodPoints = trend.map((point, index) =>
    point.mood
      ? {
          x: chartLeft + (index * chartWidth) / (trend.length - 1),
          y: chartTop + (1 - point.mood.valence) * chartHeight,
        }
      : null
  )
  const sleepValues = trend.flatMap((point) =>
    typeof point.sleepHours === "number" ? [point.sleepHours] : []
  )
  const sleepCeiling = Math.max(8, ...sleepValues)
  const sleepPoints = trend.map((point, index) =>
    typeof point.sleepHours === "number"
      ? {
          x: chartLeft + (index * chartWidth) / (trend.length - 1),
          y: chartTop + (1 - point.sleepHours / sleepCeiling) * chartHeight,
        }
      : null
  )
  const moodCount = moodPoints.filter(Boolean).length
  const sleepCount = sleepPoints.filter(Boolean).length

  if (moodCount === 0 && sleepCount === 0) return null

  return (
    <div className="border-t border-border px-5 py-6 sm:px-7 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Seven-day signal
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Your recorded mood and sleep, with gaps left honest.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--chart-1)]" />
            Mood
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--chart-3)]" />
            Sleep
          </span>
        </div>
      </div>
      <svg
        className="mt-5 h-auto w-full"
        viewBox="0 0 320 132"
        role="img"
        aria-labelledby="weekly-trend-title weekly-trend-description"
      >
        <title id="weekly-trend-title">
          Mood and sleep over the last seven days
        </title>
        <desc id="weekly-trend-description">
          Mood uses a solid line and sleep uses a dashed line. Missing daily
          recordings appear as gaps rather than connected data.
        </desc>
        {[0, 1, 2].map((row) => (
          <line
            key={row}
            x1={chartLeft}
            x2={chartLeft + chartWidth}
            y1={chartTop + (row * chartHeight) / 2}
            y2={chartTop + (row * chartHeight) / 2}
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}
        {chartSegments(moodPoints).map((points) => (
          <polyline
            key={points}
            points={points}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {chartSegments(sleepPoints).map((points) => (
          <polyline
            key={points}
            points={points}
            fill="none"
            stroke="var(--chart-3)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 5"
          />
        ))}
        {moodPoints.map(
          (point, index) =>
            point && (
              <circle
                key={`mood-${index}`}
                cx={point.x}
                cy={point.y}
                r="3.5"
                fill="var(--chart-1)"
              />
            )
        )}
        {sleepPoints.map(
          (point, index) =>
            point && (
              <circle
                key={`sleep-${index}`}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="var(--card)"
                stroke="var(--chart-3)"
                strokeWidth="2"
              />
            )
        )}
        {trend.map((point, index) => (
          <text
            key={point.date}
            x={chartLeft + (index * chartWidth) / (trend.length - 1)}
            y="122"
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="10"
          >
            {parseEntryDate(point.date).toLocaleDateString("en-US", {
              weekday: "narrow",
            })}
          </text>
        ))}
      </svg>
    </div>
  )
}

function MoodMiniChart({
  morning,
  evening,
}: {
  morning?: MoodPoint
  evening?: MoodPoint
}) {
  if (!morning && !evening) return null
  return (
    <svg width="48" height="24" viewBox="0 0 48 24" aria-hidden="true">
      {morning && evening && (
        <line
          x1={morning.valence * 40 + 4}
          y1={(1 - morning.energy) * 20 + 2}
          x2={evening.valence * 40 + 4}
          y2={(1 - evening.energy) * 20 + 2}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeOpacity="0.5"
          strokeDasharray="2 2"
          className="text-accent"
        />
      )}
      {morning && (
        <circle
          cx={morning.valence * 40 + 4}
          cy={(1 - morning.energy) * 20 + 2}
          r="3"
          className="fill-accent"
          fillOpacity="0.7"
        />
      )}
      {evening && (
        <circle
          cx={evening.valence * 40 + 4}
          cy={(1 - evening.energy) * 20 + 2}
          r="3"
          className="fill-primary"
          fillOpacity="0.7"
        />
      )}
    </svg>
  )
}

function DayCard({ entry, isToday }: { entry: DayEntry; isToday: boolean }) {
  const [expanded, setExpanded] = useState(false)
  useEffect(
    () => revealDayFragment(entry.date, () => setExpanded(true)),
    [entry.date]
  )
  const shouldReduceMotion = useReducedMotion()
  const date = parseEntryDate(entry.date)
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" })
  const detailsId = `timeline-day-${entry.date}`
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div
      id={`day-${entry.date}`}
      className={cn(
        "scroll-mt-8 rounded-2xl border bg-card transition-all lg:rounded-3xl",
        isToday ? "border-accent/40" : "border-border"
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        aria-label={`${expanded ? "Hide" : "Show"} details for ${dateLabel}`}
        className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:gap-6 lg:rounded-3xl lg:px-6 lg:py-5"
      >
        {/* Date */}
        <div className="flex w-10 flex-none flex-col items-center lg:w-14">
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {weekday}
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-medium text-foreground lg:text-2xl">
            {date.getDate()}
          </span>
        </div>

        {/* Mood mini chart */}
        <MoodMiniChart
          morning={entry.morningMood}
          evening={entry.eveningMood}
        />

        {/* Sleep */}
        {entry.sleepHours && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground lg:text-sm">
            <span>{entry.sleepHours}h</span>
          </div>
        )}

        {/* Habits */}
        {entry.habitsCompleted && entry.habitsCompleted.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="size-1.5 rounded-full bg-accent" />
            <span className="text-xs text-muted-foreground lg:text-sm">
              {entry.habitsCompleted.length}{" "}
              {entry.habitsCompleted.length === 1 ? "habit" : "habits"}
            </span>
          </div>
        )}

        {/* Journal snippet */}
        {(entry.journal || entry.quickCheckIns?.[0]?.note) && (
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground italic lg:text-sm">
            {(entry.journal || entry.quickCheckIns?.[0]?.note || "").slice(
              0,
              60
            )}
            {(entry.journal || entry.quickCheckIns?.[0]?.note || "").length > 60
              ? "…"
              : ""}
          </p>
        )}

        <div className="ml-auto flex-none text-muted-foreground">
          {expanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            id={detailsId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.3,
              ease: "easeInOut",
            }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 border-t border-border px-5 pt-4 pb-5 lg:grid lg:grid-cols-2 lg:px-6 lg:pb-6">
              {entry.quickCheckIns?.map((checkIn) => (
                <div key={checkIn.id} className="lg:col-span-2">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Check-in ·{" "}
                    {new Date(checkIn.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <JournalNote
                    target={{ day: entry.date, id: checkIn.id }}
                    text={{ note: checkIn.note, nextStep: checkIn.nextStep }}
                  />
                </div>
              ))}
              {entry.intention && (
                <div>
                  <p className="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                    Intention
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-sm text-foreground">
                    {entry.intention}
                  </p>
                </div>
              )}
              {entry.affirmation && (
                <div>
                  <p className="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                    Morning affirmation
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-sm leading-relaxed text-foreground italic">
                    &ldquo;{entry.affirmation}&rdquo;
                  </p>
                </div>
              )}
              {entry.journal && (
                <div className="lg:col-span-2">
                  <p className="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                    Journal
                  </p>
                  <JournalNote
                    target={{ day: entry.date }}
                    text={{ note: entry.journal, nextStep: "" }}
                  />
                </div>
              )}
              <div className="flex gap-6 lg:col-span-2">
                {entry.sleepQuality && (
                  <div>
                    <p className="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                      Sleep
                    </p>
                    <p className="text-sm text-foreground capitalize">
                      {entry.sleepQuality} · {entry.sleepHours}h
                    </p>
                  </div>
                )}
                {entry.meditationMinutes != null &&
                  entry.meditationMinutes > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                        Meditation
                      </p>
                      <p className="text-sm text-foreground">
                        {entry.meditationMinutes} min
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function TimelineView() {
  const state = useAppState()
  const [query, setQuery] = useState("")
  const todayKey = getTodayKey()
  const entries = Object.values(state.entries)
    .filter((entry) => matchesJournal(entry, query))
    .sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="space-y-5 pb-8">
      <div>
        <label
          htmlFor="journal-search"
          className="mb-2 block text-sm font-medium"
        >
          Find something in your journal
        </label>
        <input
          id="journal-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="A word, a feeling, a date…"
          className="min-h-12 w-full rounded-xl border border-border bg-card px-4 text-base focus-visible:outline-2 focus-visible:outline-ring"
        />
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {entries.length} {entries.length === 1 ? "day" : "days"}
          {query.trim() ? " matching your search" : " in your journal"}
        </p>
      </div>
      {entries.length ? (
        entries.map((entry) => (
          <DayCard
            key={entry.date}
            entry={entry}
            isToday={entry.date === todayKey}
          />
        ))
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          {query.trim()
            ? "No matching entries. Try another word or clear the search."
            : "Your days will gather here. Start with a note on Today."}
        </p>
      )}
    </div>
  )
}
