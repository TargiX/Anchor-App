import { z } from "zod"

/**
 * Domain model for a single day's ritual data.
 *
 * Schemas are the source of truth; the TypeScript types are inferred from
 * them. This keeps runtime validation (at the storage boundary) and the
 * compile-time types in lockstep — they can never drift apart.
 */

export const SleepQualitySchema = z.enum(["terrible", "poor", "okay", "good", "great"])
export type SleepQuality = z.infer<typeof SleepQualitySchema>

/** A point on the 2D mood grid. Both axes are normalised 0–1. */
export const MoodPointSchema = z.object({
  energy: z.number().min(0).max(1),
  valence: z.number().min(0).max(1),
})
export type MoodPoint = z.infer<typeof MoodPointSchema>

export const TimeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const DayEntrySchema = z.object({
  /** Local calendar day, `YYYY-MM-DD`. */
  date: z.string(),
  morningMood: MoodPointSchema.optional(),
  eveningMood: MoodPointSchema.optional(),
  sleepQuality: SleepQualitySchema.optional(),
  sleepHours: z.number().optional(),
  intention: z.string().optional(),
  journal: z.string().optional(),
  affirmation: z.string().optional(),
  habitsCompleted: z.array(z.string()).optional(),
  meditationMinutes: z.number().optional(),
  tomorrowBedtime: z.string().optional(),
  tomorrowSleepHours: z.number().optional(),
})
export type DayEntry = z.infer<typeof DayEntrySchema>

/** An empty entry for a given day key. */
export function emptyEntry(dateKey: string): DayEntry {
  return { date: dateKey }
}
