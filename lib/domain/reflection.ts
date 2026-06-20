import type { DayEntry, MoodPoint } from "./entry"
import { z } from "zod"
import { getTodayKey, shiftKey } from "@/lib/time/today"

/**
 * Reflective derivations — the "mirror" half of Anchor.
 *
 * Where `selectors.ts` answers "is the ritual done?", this module answers
 * "how have I been?". These are pure functions over the entry map so the
 * meaning of every number is defined once and unit-tested, never re-derived
 * inline in a component.
 *
 * Design intent: these are *reflections, not grades*. Nothing here ranks the
 * user good/bad — they surface gentle, factual signals (mood drifted up, three
 * short nights in a row, you showed up 5 of 7 days) that a calm UI can frame
 * however it likes.
 */

/** The most representative mood for a day: evening if logged, else morning. */
export function moodOf(entry: DayEntry | undefined): MoodPoint | undefined {
  return entry?.eveningMood ?? entry?.morningMood
}

/**
 * Entries falling inside the last `days` calendar days ending at `todayKey`
 * (inclusive), oldest → newest. Days with no entry are simply absent.
 */
export function entriesInWindow(
  entries: Record<string, DayEntry>,
  todayKey: string = getTodayKey(),
  days = 7
): DayEntry[] {
  const out: DayEntry[] = []
  for (let i = days - 1; i >= 0; i--) {
    const entry = entries[shiftKey(todayKey, -i)]
    if (entry) out.push(entry)
  }
  return out
}

/**
 * How a single day's mood moved from morning to evening. Positive valence
 * means the day lifted; positive energy means it built. `null` unless both
 * the morning and evening mood were captured.
 */
export function moodShift(entry: DayEntry | undefined): MoodPoint | null {
  if (!entry?.morningMood || !entry?.eveningMood) return null
  return {
    energy: entry.eveningMood.energy - entry.morningMood.energy,
    valence: entry.eveningMood.valence - entry.morningMood.valence,
  }
}

/** Average valence (0–1) across days in the window that have any mood. */
export function averageValence(
  entries: Record<string, DayEntry>,
  todayKey: string = getTodayKey(),
  days = 7
): number | null {
  const moods = entriesInWindow(entries, todayKey, days)
    .map(moodOf)
    .filter((m): m is MoodPoint => m !== undefined)
  if (moods.length === 0) return null
  return moods.reduce((sum, m) => sum + m.valence, 0) / moods.length
}

export type MoodDirection = "rising" | "steady" | "falling"

/**
 * Trend, not snapshot: compares the recent half of the window against the
 * older half. `null` until both halves carry at least one mood reading.
 */
export function moodDirection(
  entries: Record<string, DayEntry>,
  todayKey: string = getTodayKey(),
  days = 7,
  epsilon = 0.05
): MoodDirection | null {
  const half = Math.floor(days / 2)
  if (half < 1) return null
  const older = averageValence(entries, shiftKey(todayKey, -half), days - half)
  const recent = averageValence(entries, todayKey, half)
  if (older === null || recent === null) return null
  const delta = recent - older
  if (delta > epsilon) return "rising"
  if (delta < -epsilon) return "falling"
  return "steady"
}

/** How many of the last `days` were active (either ritual done), and of how many. */
export function activeDays(
  entries: Record<string, DayEntry>,
  todayKey: string = getTodayKey(),
  days = 7
): { count: number; of: number } {
  let count = 0
  for (let i = 0; i < days; i++) {
    const entry = entries[shiftKey(todayKey, -i)]
    if (entry?.eveningMood && entry?.journal) count++
    else if (entry?.morningMood && entry?.intention) count++
  }
  return { count, of: days }
}

/** Average recorded sleep hours across the window. `null` if none recorded. */
export function averageSleepHours(
  entries: Record<string, DayEntry>,
  todayKey: string = getTodayKey(),
  days = 7
): number | null {
  const hours = entriesInWindow(entries, todayKey, days)
    .map((e) => e.sleepHours)
    .filter((h): h is number => typeof h === "number")
  if (hours.length === 0) return null
  return hours.reduce((sum, h) => sum + h, 0) / hours.length
}

/**
 * Consecutive recorded nights, ending at the most recent logged night, that
 * fell below `threshold` hours. A night not yet logged (e.g. today) does not
 * break the run — we start from the latest night that has a value, mirroring
 * how `computeStreak` treats an unfinished today. A logged night at/above the
 * threshold, or a gap with no value, ends the run.
 */
export function consecutiveLowSleepNights(
  entries: Record<string, DayEntry>,
  todayKey: string = getTodayKey(),
  threshold = 6
): number {
  let cursor =
    typeof entries[todayKey]?.sleepHours === "number"
      ? todayKey
      : shiftKey(todayKey, -1)
  let count = 0
  while (true) {
    const hours = entries[cursor]?.sleepHours
    if (typeof hours !== "number" || hours >= threshold) break
    count++
    cursor = shiftKey(cursor, -1)
  }
  return count
}

/** Tally of how many times each habit id was completed across the window. */
export function habitCounts(
  entries: Record<string, DayEntry>,
  todayKey: string = getTodayKey(),
  days = 7
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const entry of entriesInWindow(entries, todayKey, days)) {
    for (const id of entry.habitsCompleted ?? []) {
      counts[id] = (counts[id] ?? 0) + 1
    }
  }
  return counts
}

/**
 * One row of a mood/sleep trend chart.
 *
 * Every calendar day in the window is present (oldest → newest) so the X axis
 * is continuous and gaps stay honest. Fields are `undefined` on days the user
 * logged nothing — a chart with `connectNulls` off will simply break the line
 * there, rather than papering over a missed day. This is distinct from
 * `entriesInWindow`, which drops absent days entirely (good for averages, bad
 * for a faithful time axis).
 */
export const trendPointSchema = z.object({
  date: z.string(),
  morningValence: z.number().optional(),
  eveningValence: z.number().optional(),
  sleepHours: z.number().optional(),
})

export type TrendPoint = z.infer<typeof trendPointSchema>

export function trendPoints(
  entries: Record<string, DayEntry>,
  todayKey: string = getTodayKey(),
  days = 14
): TrendPoint[] {
  const out: TrendPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const key = shiftKey(todayKey, -i)
    const entry = entries[key]
    out.push({
      date: key,
      morningValence: entry?.morningMood?.valence,
      eveningValence: entry?.eveningMood?.valence,
      sleepHours: entry?.sleepHours,
    })
  }
  return out
}
