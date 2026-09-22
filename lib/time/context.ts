/**
 * Time-of-day greeting for the affirmation step.
 * Hour boundaries: morning < 12 ≤ midday < 18 ≤ evening.
 */

export function getGreeting(hour: number): string {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

