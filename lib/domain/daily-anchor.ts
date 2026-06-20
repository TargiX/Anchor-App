import { z } from "zod"
import type { DayEntry } from "./entry"
import type { Habit } from "./habit"
import { isEveningComplete, isMorningComplete } from "./selectors"
import { moodShift } from "./reflection"

export const DailyAnchorToneSchema = z.enum([
  "empty",
  "started",
  "building",
  "anchored",
])
export type DailyAnchorTone = z.infer<typeof DailyAnchorToneSchema>

export const DailyAnchorMetricSchema = z.object({
  id: z.enum(["morning", "evening", "habits", "sleep", "mood"]),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  points: z.number(),
  maxPoints: z.number(),
})
export type DailyAnchorMetric = z.infer<typeof DailyAnchorMetricSchema>

export const DailyAnchorSnapshotSchema = z.object({
  score: z.number(),
  tone: DailyAnchorToneSchema,
  headline: z.string(),
  summary: z.string(),
  nextStep: z.string(),
  metrics: z.array(DailyAnchorMetricSchema),
})
export type DailyAnchorSnapshot = z.infer<typeof DailyAnchorSnapshotSchema>

function matchedCompletedHabits(
  entry: DayEntry | undefined,
  habits: Habit[]
): number {
  const habitIds = new Set(habits.map((habit) => habit.id))
  return new Set(
    (entry?.habitsCompleted ?? []).filter((id) => habitIds.has(id))
  ).size
}

export function computeDailyAnchor(
  entry: DayEntry | undefined,
  habits: Habit[]
): DailyAnchorSnapshot {
  const morningDone = isMorningComplete(entry)
  const eveningDone = isEveningComplete(entry)
  const completedHabits = matchedCompletedHabits(entry, habits)
  const habitTotal = habits.length
  const habitRatio =
    habitTotal > 0 ? Math.min(1, completedHabits / habitTotal) : 0
  const sleepHours = entry?.sleepHours
  const shift = moodShift(entry)

  const metrics: DailyAnchorMetric[] = [
    {
      id: "morning",
      label: "Morning",
      value: morningDone ? "Complete" : "Open",
      detail: morningDone
        ? "Mood and intention captured"
        : "Capture mood and intention",
      points: morningDone
        ? 24
        : entry?.morningMood || entry?.intention
          ? 12
          : 0,
      maxPoints: 24,
    },
    {
      id: "evening",
      label: "Evening",
      value: eveningDone ? "Complete" : "Open",
      detail: eveningDone
        ? "Mood and reflection captured"
        : "Close with mood and reflection",
      points: eveningDone ? 24 : entry?.eveningMood || entry?.journal ? 12 : 0,
      maxPoints: 24,
    },
    {
      id: "habits",
      label: "Habits",
      value: habitTotal > 0 ? `${completedHabits}/${habitTotal}` : "Not set",
      detail:
        habitTotal > 0
          ? "Completed today"
          : "Add habits to track a repeatable pattern",
      points: Math.round(habitRatio * 20),
      maxPoints: 20,
    },
    {
      id: "sleep",
      label: "Sleep",
      value:
        typeof sleepHours === "number" ? `${formatHours(sleepHours)}h` : "Open",
      detail:
        typeof sleepHours === "number"
          ? sleepHours >= 7
            ? "Sleep window protected"
            : "A shorter night to watch"
          : "Log last night during the morning ritual",
      points:
        typeof sleepHours === "number"
          ? sleepHours >= 7
            ? 16
            : sleepHours >= 6
              ? 10
              : 6
          : 0,
      maxPoints: 16,
    },
    {
      id: "mood",
      label: "Mood shift",
      value: formatMoodShift(shift),
      detail: shift
        ? "Morning to evening movement"
        : entry?.morningMood || entry?.eveningMood
          ? "One mood captured"
          : "No mood signal yet",
      points: shift ? 16 : entry?.morningMood || entry?.eveningMood ? 8 : 0,
      maxPoints: 16,
    },
  ]

  const score = metrics.reduce((sum, metric) => sum + metric.points, 0)
  const tone =
    score >= 80
      ? "anchored"
      : score >= 45
        ? "building"
        : score > 0
          ? "started"
          : "empty"

  return {
    score,
    tone,
    headline: headlineFor(tone),
    summary: summaryFor(
      tone,
      morningDone,
      eveningDone,
      completedHabits,
      habitTotal
    ),
    nextStep: nextStepFor(entry, habits),
    metrics,
  }
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatMoodShift(shift: ReturnType<typeof moodShift>): string {
  if (!shift) return "Open"
  const delta = Math.round(shift.valence * 100)
  if (delta > 0) return `+${delta}%`
  if (delta < 0) return `${delta}%`
  return "Steady"
}

function headlineFor(tone: DailyAnchorTone): string {
  if (tone === "anchored") return "Your day has a clear signal."
  if (tone === "building") return "A useful pattern is forming."
  if (tone === "started") return "You have started the thread."
  return "No signal yet."
}

function summaryFor(
  tone: DailyAnchorTone,
  morningDone: boolean,
  eveningDone: boolean,
  completedHabits: number,
  habitTotal: number
): string {
  if (tone === "empty") {
    return "Anchor can reflect the day once you capture a few small signals."
  }
  if (tone === "anchored") {
    return "Morning, evening, and body signals are connected enough to reflect on."
  }
  if (morningDone && !eveningDone) {
    return "The morning is grounded. The evening ritual will close the loop."
  }
  if (!morningDone && eveningDone) {
    return "The evening is captured. Add a morning signal tomorrow for contrast."
  }
  if (habitTotal > 0 && completedHabits > 0) {
    return "Your habits are adding evidence to the day."
  }
  return "A few more signals will make the reflection more useful."
}

function nextStepFor(entry: DayEntry | undefined, habits: Habit[]): string {
  if (!isMorningComplete(entry)) return "Start with mood and intention."
  if (!isEveningComplete(entry)) return "Close the day with a short reflection."
  const completed = matchedCompletedHabits(entry, habits)
  if (habits.length > 0 && completed < habits.length) {
    return "Mark the habits that actually happened."
  }
  if (!entry?.tomorrowBedtime && !entry?.tomorrowSleepHours) {
    return "Set tomorrow's sleep window."
  }
  return "Review the timeline for the wider pattern."
}
