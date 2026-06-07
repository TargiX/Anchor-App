/**
 * Calendar-day helpers. All keys are local-time `YYYY-MM-DD` strings.
 *
 * We deliberately avoid `Date.toISOString()` for day keys: it returns the
 * UTC date, which flips a day early/late for users far from UTC (e.g. an
 * evening entry in UTC+2 would be filed under tomorrow). Everything here
 * works off the local calendar instead.
 */

/** Local calendar day for `date` as `YYYY-MM-DD`. */
export function getTodayKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Parse a `YYYY-MM-DD` key back into a local `Date` anchored at noon.
 * Noon avoids DST/timezone off-by-one when the date is later formatted.
 */
export function parseEntryDate(key: string): Date {
  return new Date(`${key}T12:00:00`)
}

/** Return a new day-key shifted by `deltaDays` (negative = earlier). */
export function shiftKey(key: string, deltaDays: number): string {
  const date = parseEntryDate(key)
  date.setDate(date.getDate() + deltaDays)
  return getTodayKey(date)
}

/** Whole calendar days from `fromKey` to `toKey` (`to - from`). */
export function dayDiff(fromKey: string, toKey: string): number {
  const from = parseEntryDate(fromKey).getTime()
  const to = parseEntryDate(toKey).getTime()
  return Math.round((to - from) / 86_400_000)
}
