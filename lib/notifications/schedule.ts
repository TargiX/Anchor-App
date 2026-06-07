/**
 * Pure scheduling math for daily reminders. Kept separate from the browser
 * Notification API so it can be unit-tested without a DOM.
 */

/** Parse a `HH:MM` string into hours/minutes, or null if malformed. */
export function parseTime(time: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return { hours, minutes }
}

/**
 * The next local `Date` at which `HH:MM` occurs. If that time today has
 * already passed (or is exactly now), returns the same time tomorrow.
 */
export function nextOccurrence(time: string, from: Date = new Date()): Date | null {
  const parsed = parseTime(time)
  if (!parsed) return null
  const next = new Date(from)
  next.setHours(parsed.hours, parsed.minutes, 0, 0)
  if (next.getTime() <= from.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next
}

/** Milliseconds from `from` until the next occurrence of `time`. */
export function msUntilNext(time: string, from: Date = new Date()): number | null {
  const next = nextOccurrence(time, from)
  return next ? next.getTime() - from.getTime() : null
}
