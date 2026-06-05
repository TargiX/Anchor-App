import type { Habit } from "./habit"

/**
 * Input constraints and validators. Centralised here (not as magic numbers
 * scattered in components) so the rules are consistent and unit-testable.
 */
export const LIMITS = {
  intentionMax: 200,
  journalMax: 2000,
  habitNameMax: 40,
  habitsMax: 12,
} as const

export type ValidationResult = { ok: true } | { ok: false; error: string }

/** Real word count (not characters). Empty/whitespace → 0. */
export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/** Validate a new habit name against the existing list. */
export function validateHabitName(name: string, existing: Habit[]): ValidationResult {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: "Enter a habit name." }
  if (trimmed.length > LIMITS.habitNameMax) {
    return { ok: false, error: `Keep it under ${LIMITS.habitNameMax} characters.` }
  }
  if (existing.length >= LIMITS.habitsMax) {
    return { ok: false, error: `You can track up to ${LIMITS.habitsMax} habits.` }
  }
  if (existing.some((h) => h.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: "That habit already exists." }
  }
  return { ok: true }
}
