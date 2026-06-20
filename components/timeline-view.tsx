"use client"

import { useState, useSyncExternalStore } from "react"
import { useAppState } from "@/hooks/use-store"
import { cn } from "@/lib/utils"
import { type DayEntry, type MoodPoint } from "@/lib/domain/entry"
import { trendPoints, type TrendPoint } from "@/lib/domain/reflection"
import { getTodayKey, parseEntryDate } from "@/lib/time/today"
import { ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

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
  const date = parseEntryDate(entry.date)
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" })

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card transition-all lg:rounded-3xl",
        isToday ? "border-accent/40" : "border-border"
      )}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left lg:gap-6 lg:px-6 lg:py-5"
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
              {entry.habitsCompleted.length} habits
            </span>
          </div>
        )}

        {/* Journal snippet */}
        {entry.journal && (
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground italic lg:text-sm">
            {entry.journal.slice(0, 60)}
            {entry.journal.length > 60 ? "…" : ""}
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 border-t border-border px-5 pt-4 pb-5 lg:grid lg:grid-cols-2 lg:px-6 lg:pb-6">
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
              {entry.journal && (
                <div className="lg:col-span-2">
                  <p className="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                    Journal
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">
                    {entry.journal}
                  </p>
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

/** Recharts injects active/payload/label by cloning the element. */
type TrendTooltipProps = {
  active?: boolean
  payload?: Array<{
    dataKey?: string | number
    name?: string
    value?: number
    color?: string
  }>
  label?: string | number
  unit?: "score" | "h"
}

function TrendTooltip({ active, payload, label, unit }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const rows = payload.filter((p) => typeof p.value === "number")
  if (rows.length === 0) return null
  const date = parseEntryDate(String(label))
  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-sm">
      <p className="mb-1.5 text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
        {dateLabel}
      </p>
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <p
            key={String(row.dataKey)}
            className="flex items-center gap-1.5 text-xs text-foreground"
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{row.name}</span>
            <span className="ml-auto tabular-nums font-medium">
              {unit === "h"
                ? `${row.value}h`
                : Number(row.value).toFixed(2)}
            </span>
          </p>
        ))}
      </div>
    </div>
  )
}

/**
 * Mood shape over the window. We deliberately hide the numeric valence axis:
 * this is a *reflection* (how mood has been moving), not a score. The shape and
 * the hover detail are enough — a persistent 0–1 scale would read like grading.
 */
function MoodTrendChart({
  data,
  animate,
}: {
  data: TrendPoint[]
  animate: boolean
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 8 }}>
        <XAxis
          dataKey="date"
          tickMargin={8}
          interval={1}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickFormatter={(value: string) =>
            parseEntryDate(value).toLocaleDateString("en-US", {
              month: "numeric",
              day: "numeric",
            })
          }
        />
        <YAxis hide domain={[0, 1]} />
        <Tooltip
          content={<TrendTooltip unit="score" />}
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="morningValence"
          name="Morning"
          stroke="var(--chart-1)"
          strokeWidth={1.5}
          dot={{ r: 2, fill: "var(--chart-1)", strokeWidth: 0 }}
          activeDot={{ r: 3.5, strokeWidth: 0 }}
          connectNulls={false}
          isAnimationActive={animate}
        />
        <Line
          type="monotone"
          dataKey="eveningValence"
          name="Evening"
          stroke="var(--chart-4)"
          strokeWidth={1.5}
          dot={{ r: 2, fill: "var(--chart-4)", strokeWidth: 0 }}
          activeDot={{ r: 3.5, strokeWidth: 0 }}
          connectNulls={false}
          isAnimationActive={animate}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Sleep hours are an objective measure, so the hours axis is shown. */
function SleepTrendChart({
  data,
  animate,
}: {
  data: TrendPoint[]
  animate: boolean
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 8 }}>
        <XAxis
          dataKey="date"
          tickMargin={8}
          interval={1}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickFormatter={(value: string) =>
            parseEntryDate(value).toLocaleDateString("en-US", {
              month: "numeric",
              day: "numeric",
            })
          }
        />
        <YAxis
          domain={[0, 12]}
          ticks={[0, 4, 8, 12]}
          width={26}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickFormatter={(value: number) => `${value}h`}
        />
        <Tooltip
          content={<TrendTooltip unit="h" />}
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="sleepHours"
          name="Sleep"
          stroke="var(--chart-2)"
          strokeWidth={1.5}
          dot={{ r: 2, fill: "var(--chart-2)", strokeWidth: 0 }}
          activeDot={{ r: 3.5, strokeWidth: 0 }}
          connectNulls={false}
          isAnimationActive={animate}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * Client-only flag: `false` during SSR, `true` after hydration. Used to defer
 * Recharts' ResponsiveContainer (which measures its parent on the client) so we
 * never hit a width-0 hydration warning or layout shift. useSyncExternalStore is
 * the React-blessed way to read this without a hydration mismatch or an extra
 * setState-in-effect render.
 */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

function ChartCard({
  title,
  legend,
  height,
  children,
}: {
  title: string
  legend: React.ReactNode
  height: number
  children: React.ReactNode
}) {
  const mounted = useMounted()
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          {title}
        </h3>
        <div className="flex items-center gap-3">{legend}</div>
      </div>
      <div className="relative" style={{ height }}>
        {mounted ? (
          children
        ) : (
          <div className="size-full animate-pulse rounded-lg bg-muted/40" />
        )}
      </div>
    </div>
  )
}

function Swatch({ className }: { className: string }) {
  return <span className={cn("size-1.5 rounded-full", className)} aria-hidden />
}

/**
 * "How have I been?" at a glance. Sits at the top of the timeline so the
 * pattern is visible before the per-day detail. Needs at least two readings of
 * a kind to draw a line; below that we say so plainly instead of drawing a
 * broken chart.
 */
function TrendSection({ entries }: { entries: Record<string, DayEntry> }) {
  const reduceMotion = useReducedMotion()
  const animate = !reduceMotion
  const todayKey = getTodayKey()
  const points = trendPoints(entries, todayKey, 14)

  const moodCount = points.filter(
    (p) => p.morningValence != null || p.eveningValence != null
  ).length
  const sleepCount = points.filter((p) => p.sleepHours != null).length

  if (moodCount < 2 && sleepCount < 2) {
    return (
      <p className="px-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
        Trends appear after a couple of days
      </p>
    )
  }

  return (
    <section className="rounded-2xl border border-border bg-card px-5 py-5 lg:rounded-3xl lg:px-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-sm font-medium text-foreground">
          Last 14 days
        </h2>
        <span className="text-xs text-muted-foreground">Mood &amp; sleep</span>
      </div>
      <div className="flex flex-col gap-5">
        {moodCount >= 2 && (
          <ChartCard
            title="Mood"
            height={120}
            legend={
              <>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Swatch className="bg-[var(--chart-1)]" /> Morning
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Swatch className="bg-[var(--chart-4)]" /> Evening
                </span>
              </>
            }
          >
            <MoodTrendChart data={points} animate={animate} />
          </ChartCard>
        )}
        {sleepCount >= 2 && (
          <ChartCard
            title="Sleep"
            height={110}
            legend={
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Swatch className="bg-[var(--chart-2)]" /> Hours
              </span>
            }
          >
            <SleepTrendChart data={points} animate={animate} />
          </ChartCard>
        )}
      </div>
    </section>
  )
}

export function TimelineView() {
  const state = useAppState()
  const todayKey = getTodayKey()

  // Group entries by week
  const entries = Object.values(state.entries).sort((a, b) =>
    b.date.localeCompare(a.date)
  )

  // Generate last 14 days as skeleton if empty
  const displayEntries = entries.length > 0 ? entries : []

  if (displayEntries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 lg:min-h-[420px]">
        <p className="max-w-xs text-center font-[family-name:var(--font-display)] text-sm text-muted-foreground italic lg:max-w-md lg:text-lg lg:leading-8">
          Your timeline will fill in as you complete rituals. Start this
          morning.
        </p>
      </div>
    )
  }

  // Group by week
  const weeks: DayEntry[][] = []
  let currentWeek: DayEntry[] = []

  displayEntries.forEach((entry, i) => {
    currentWeek.push(entry)
    const d = parseEntryDate(entry.date)
    if (d.getDay() === 0 || i === displayEntries.length - 1) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  return (
    <div className="flex flex-col gap-6 pb-8">
      <TrendSection entries={state.entries} />
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-2">
          <p className="px-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {wi === 0 ? "This week" : `${week.length} days`}
          </p>
          {week.map((entry) => (
            <DayCard
              key={entry.date}
              entry={entry}
              isToday={entry.date === todayKey}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
