/**
 * Time-of-day context for the home screen and ritual prompts.
 * Single source of truth — previously this logic was duplicated (and
 * inconsistent) across the home page and the affirmation step.
 */

export type TimeContext = "morning" | "midday" | "evening"

/** Hour boundaries: morning < 12 ≤ midday < 18 ≤ evening. */
export function getTimeContext(hour: number): TimeContext {
  if (hour < 12) return "morning"
  if (hour < 18) return "midday"
  return "evening"
}

export function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function getTimeLabel(hour: number): string {
  if (hour < 12) return "Morning ritual"
  if (hour < 18) return "Quick check-in"
  return "Evening ritual"
}
