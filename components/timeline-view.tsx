"use client"

import { useState } from "react"
import { useAppState } from "@/hooks/use-store"
import { cn } from "@/lib/utils"
import { type DayEntry, type MoodPoint } from "@/lib/domain/entry"
import { getTodayKey, parseEntryDate } from "@/lib/time/today"
import { ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

function MoodMiniChart({ morning, evening }: { morning?: MoodPoint; evening?: MoodPoint }) {
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
        "rounded-2xl border bg-card transition-all",
        isToday ? "border-accent/40" : "border-border"
      )}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        {/* Date */}
        <div className="flex flex-col items-center w-10 flex-none">
          <span className="text-xs text-muted-foreground font-medium uppercase">{weekday}</span>
          <span className="font-[family-name:var(--font-display)] text-lg font-medium text-foreground">
            {date.getDate()}
          </span>
        </div>

        {/* Mood mini chart */}
        <MoodMiniChart morning={entry.morningMood} evening={entry.eveningMood} />

        {/* Sleep */}
        {entry.sleepHours && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <span>{entry.sleepHours}h</span>
          </div>
        )}

        {/* Habits */}
        {entry.habitsCompleted && entry.habitsCompleted.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="size-1.5 rounded-full bg-accent" />
            <span className="text-xs text-muted-foreground">{entry.habitsCompleted.length} habits</span>
          </div>
        )}

        {/* Journal snippet */}
        {entry.journal && (
          <p className="flex-1 text-xs text-muted-foreground truncate italic">
            {entry.journal.slice(0, 60)}
            {entry.journal.length > 60 ? "…" : ""}
          </p>
        )}

        <div className="ml-auto text-muted-foreground flex-none">
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
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
            <div className="px-5 pb-5 flex flex-col gap-4 border-t border-border pt-4">
              {entry.intention && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">Intention</p>
                  <p className="text-sm text-foreground font-[family-name:var(--font-display)]">{entry.intention}</p>
                </div>
              )}
              {entry.journal && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">Journal</p>
                  <p className="text-sm text-foreground leading-relaxed">{entry.journal}</p>
                </div>
              )}
              <div className="flex gap-6">
                {entry.sleepQuality && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">Sleep</p>
                    <p className="text-sm text-foreground capitalize">{entry.sleepQuality} · {entry.sleepHours}h</p>
                  </div>
                )}
                {entry.meditationMinutes != null && entry.meditationMinutes > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">Meditation</p>
                    <p className="text-sm text-foreground">{entry.meditationMinutes} min</p>
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
  const entries = Object.values(state.entries).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // Generate last 14 days as skeleton if empty
  const displayEntries = entries.length > 0 ? entries : []

  if (displayEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-16">
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-display)] italic text-center max-w-xs">
          Your timeline will fill in as you complete rituals. Start this morning.
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
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium px-1">
            {wi === 0 ? "This week" : `${week.length} days`}
          </p>
          {week.map((entry) => (
            <DayCard key={entry.date} entry={entry} isToday={entry.date === todayKey} />
          ))}
        </div>
      ))}
    </div>
  )
}
