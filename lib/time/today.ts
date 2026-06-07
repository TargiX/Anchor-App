/**
 * Returns a local-day key (YYYY-MM-DD) using the user's timezone.
 * Avoids `toISOString()` which shifts dates near midnight due to UTC offset.
 */
export function getLocalTodayKey(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
