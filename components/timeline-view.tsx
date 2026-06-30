"use client"

import { useState } from "react"
import { useAppState } from "@/hooks/use-store"
import { cn } from "@/lib/utils"
import { type DayEntry, type MoodPoint } from "@/lib/domain/entry"
import { getTodayKey, parseEntryDate } from "@/lib/time/today"
import { ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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
