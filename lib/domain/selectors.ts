import type { DayEntry } from "./entry"
import { getTodayKey, shiftKey } from "@/lib/time/today"

/**
 * Pure derivations over entries. These live here (not in components) so the
 * rules are defined once and are unit-testable. Components read them; they
 * never re-implement "is the morning done?" inline.
 */

/** Morning ritual counts as done once mood and intention are captured. */
export function isMorningComplete(entry: DayEntry | undefined): boolean {
  return Boolean(entry?.morningMood && entry?.intention)
}

/** Evening ritual counts as done once mood and journal are captured. */
export function isEveningComplete(entry: DayEntry | undefined): boolean {
  return Boolean(entry?.eveningMood && entry?.journal)
}

/** A day is "active" if either ritual was completed. */
export function isDayActive(entry: DayEntry | undefined): boolean {
  return isMorningComplete(entry) || isEveningComplete(entry)
}

/**
 * Consecutive active days ending today.
 *
 * Today not being done yet does not break the streak — we count back from
 * yesterday in that case, so the number only resets after a fully missed day.
 */
export function computeStreak(
  entries: Record<string, DayEntry>,
  todayKey: string = getTodayKey()
): number {
  let cursor = isDayActive(entries[todayKey]) ? todayKey : shiftKey(todayKey, -1)
  let streak = 0
  while (isDayActive(entries[cursor])) {
    streak++
    cursor = shiftKey(cursor, -1)
  }
  return streak
}
