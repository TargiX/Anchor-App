"use client"

import { useEffect, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DayEntry } from "@/lib/domain/entry"
import { weeklyTrendSeries } from "@/lib/domain/reflection"
import { parseEntryDate } from "@/lib/time/today"

/** Trend window for the timeline strip. */
const TREND_DAYS = 14

type TrendRow = {
  date: string
  valence: number | null
  sleepHours: number | null
}

/** Subscribed via matchMedia so a runtime OS toggle updates without a remount. */
function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduceMotion(query.matches)
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return reduceMotion
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: TrendRow }>
}) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-foreground">
        {parseEntryDate(row.date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </p>
      {row.valence !== null && (
        <p className="mt-1 flex items-center gap-2 text-muted-foreground">
          <span
            className="size-2 rounded-full bg-[var(--chart-1)]"
            aria-hidden="true"
          />
          Mood{" "}
          <span className="tabular-nums text-foreground">
            {Math.round(row.valence * 100)}%
          </span>
        </p>
      )}
      {row.sleepHours !== null && (
        <p className="mt-1 flex items-center gap-2 text-muted-foreground">
          <span
            className="size-2 rounded-full bg-[var(--chart-3)]"
            aria-hidden="true"
          />
          Sleep{" "}
          <span className="tabular-nums text-foreground">
            {row.sleepHours}h
          </span>
        </p>
      )}
    </div>
  )
}

/**
 * Mood and sleep over the last two weeks, drawn from real entries. Renders
 * nothing until at least two days carry data — the day list below is the
 * empty state. Loaded via `next/dynamic` from the timeline so recharts stays
 * out of the route's initial bundle.
 */
export function TimelineChart({
  entries,
  todayKey,
}: {
  entries: Record<string, DayEntry>
  todayKey: string
}) {
  const reduceMotion = usePrefersReducedMotion()
  const trend = weeklyTrendSeries(entries, todayKey, TREND_DAYS)
  const daysWithData = trend.filter(
    (point) => point.mood || point.sleepHours !== undefined
  ).length
  if (daysWithData < 2) return null

  const rows: TrendRow[] = trend.map((point) => ({
    date: point.date,
    valence: point.mood ? point.mood.valence : null,
    sleepHours: point.sleepHours ?? null,
  }))

  return (
    <section
      aria-labelledby="timeline-trend-title"
      className="rounded-2xl border bg-card px-5 py-5 sm:px-7 lg:rounded-3xl lg:px-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="timeline-trend-title"
            className="font-[family-name:var(--font-display)] text-xl"
          >
            Recent signal
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Mood and sleep across the last two weeks, with gaps left honest.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span
              className="size-2 rounded-full bg-[var(--chart-1)]"
              aria-hidden="true"
            />
            Mood
          </span>
          <span className="flex items-center gap-2">
            <span
              className="size-2 rounded-full bg-[var(--chart-3)]"
              aria-hidden="true"
            />
            Sleep
          </span>
        </div>
      </div>
      <p className="sr-only">
        Line chart of daily mood and sleep over the last two weeks. Mood is a
        solid line from 0 to 100 percent; sleep is a dashed line in hours.
        Days without recordings leave gaps rather than being connected.
      </p>
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={148}>
          <LineChart
            data={rows}
            margin={{ top: 8, right: 12, bottom: 0, left: 12 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              interval={2}
              tickFormatter={(value: string) =>
                String(parseEntryDate(value).getDate())
              }
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickMargin={8}
            />
            <YAxis yAxisId="mood" domain={[0, 1]} hide />
            <YAxis
              yAxisId="sleep"
              domain={[0, (max: number) => Math.max(8, Math.ceil(max))]}
              hide
            />
            <Tooltip
              content={<TrendTooltip />}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <Line
              yAxisId="mood"
              type="monotone"
              dataKey="valence"
              name="Mood"
              stroke="var(--chart-1)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={{ r: 2.5, fill: "var(--chart-1)", strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              isAnimationActive={!reduceMotion}
            />
            <Line
              yAxisId="sleep"
              type="monotone"
              dataKey="sleepHours"
              name="Sleep"
              stroke="var(--chart-3)"
              strokeWidth={2}
              strokeDasharray="4 5"
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={{
                r: 2.5,
                fill: "var(--card)",
                stroke: "var(--chart-3)",
                strokeWidth: 2,
              }}
              activeDot={{ r: 4 }}
              isAnimationActive={!reduceMotion}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
