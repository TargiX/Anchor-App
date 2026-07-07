/**
 * Calendar-day helpers. All keys are local-time `YYYY-MM-DD` strings.
 *
 * We deliberately avoid `Date.toISOString()` for day keys: it returns the
 * UTC date, which flips a day early/late for users far from UTC (e.g. an
 * evening entry in UTC+2 would be filed under tomorrow). Everything here
 * works off the local calendar instead.
 */

/** Local calendar day for `date` as `YYYY-MM-DD`. */
export function getTodayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getZonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date)

  const value = (type, fallback) => parts.find((part) => part.type === type)?.value ?? fallback

  return {
    year: value("year", "1970"),
    month: value("month", "01"),
    day: value("day", "01"),
    hour: value("hour", "00"),
    minute: value("minute", "00"),
    second: value("second", "00"),
  }
}

function getOffsetMinutes(date, timeZone, parts) {
  if (!timeZone) return -date.getTimezoneOffset()

  const zonedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  )
  return Math.round((zonedAsUtc - date.getTime()) / 60_000)
}

function formatOffset(minutes) {
  const sign = minutes >= 0 ? "+" : "-"
  const abs = Math.abs(minutes)
  const hours = String(Math.floor(abs / 60)).padStart(2, "0")
  const mins = String(abs % 60).padStart(2, "0")
  return `${sign}${hours}:${mins}`
}

/** Calendar day for `date` in a named IANA timezone as `YYYY-MM-DD`. */
export function getLocalDayKey(date = new Date(), timeZone) {
  if (!timeZone) return getTodayKey(date)
  const parts = getZonedParts(date, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** Hour of day for `date` in a named IANA timezone. */
export function getLocalHour(date = new Date(), timeZone) {
  if (!timeZone) return date.getHours()
  return Number(getZonedParts(date, timeZone).hour)
}

/** ISO-like local timestamp for `date`, preserving the target timezone offset. */
export function getLocalTimestamp(date = new Date(), timeZone) {
  const parts = timeZone
    ? getZonedParts(date, timeZone)
    : {
        year: String(date.getFullYear()).padStart(4, "0"),
        month: String(date.getMonth() + 1).padStart(2, "0"),
        day: String(date.getDate()).padStart(2, "0"),
        hour: String(date.getHours()).padStart(2, "0"),
        minute: String(date.getMinutes()).padStart(2, "0"),
        second: String(date.getSeconds()).padStart(2, "0"),
      }
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${formatOffset(
    getOffsetMinutes(date, timeZone, parts)
  )}`
}

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

function assertDayKey(key) {
  if (!DAY_KEY_RE.test(key)) {
    throw new Error(`Invalid day key: ${key}`)
  }
}

/**
 * Parse a `YYYY-MM-DD` key back into a local `Date` anchored at noon.
 * Noon avoids DST/timezone off-by-one when the date is later formatted.
 */
export function parseEntryDate(key) {
  assertDayKey(key)
  const date = new Date(`${key}T12:00:00`)
  if (Number.isNaN(date.getTime()) || getTodayKey(date) !== key) {
    throw new Error(`Invalid day key: ${key}`)
  }
  return date
}

/** Return a new day-key shifted by `deltaDays` (negative = earlier). */
export function shiftKey(key, deltaDays) {
  const date = parseEntryDate(key)
  date.setDate(date.getDate() + deltaDays)
  return getTodayKey(date)
}

/** Whole calendar days from `fromKey` to `toKey` (`to - from`). */
export function dayDiff(fromKey, toKey) {
  const from = parseEntryDate(fromKey).getTime()
  const to = parseEntryDate(toKey).getTime()
  return Math.round((to - from) / 86_400_000)
}
