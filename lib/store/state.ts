import { z } from "zod"
import { DayEntrySchema, TimeOfDaySchema, type DayEntry } from "@/lib/domain/entry"
import { HabitSchema, DEFAULT_HABITS } from "@/lib/domain/habit"

/**
 * Persisted application state.
 *
 * Note what is NOT here on purpose:
 *  - `streak` is derived (see `computeStreak`), never stored.
 *  - theme is owned by `next-themes`, not duplicated here.
 */
export const AppStateSchema = z.object({
  entries: z.record(z.string(), DayEntrySchema),
  habits: z.array(HabitSchema),
  notificationMorning: TimeOfDaySchema,
  notificationEvening: TimeOfDaySchema,
})
export type AppState = z.infer<typeof AppStateSchema>

export const STORAGE_KEY = "anchor-state"
/** Bump when the persisted shape changes; add a branch in `migrate`. */
export const STATE_VERSION = 1

export const INITIAL_STATE: AppState = {
  entries: {},
  habits: DEFAULT_HABITS,
  notificationMorning: "08:00",
  notificationEvening: "20:00",
}

/** Envelope the data is stored under, so we can version + migrate it. */
const EnvelopeSchema = z.object({
  version: z.number(),
  data: z.unknown(),
})

/**
 * Turn whatever is in storage into a valid `AppState`.
 *
 * Handles three cases without ever throwing:
 *  1. Current envelope `{ version, data }` → validate `data`.
 *  2. Legacy flat state (v0, pre-envelope, with extra `streak`/`theme`/
 *     `focusAreas` keys) → zod strips unknown keys, so it parses cleanly.
 *  3. Anything corrupt/partial → recover each field independently (a single
 *     bad entry is dropped, not the whole store), else fall back to
 *     `INITIAL_STATE`. Bad data should never crash the app or wipe good data.
 */
export function migrate(raw: unknown): AppState {
  const enveloped = EnvelopeSchema.safeParse(raw)
  const candidate = enveloped.success ? enveloped.data.data : raw

  const strict = AppStateSchema.safeParse(candidate)
  if (strict.success) return strict.data

  return recover(candidate)
}

/** Field-by-field best-effort recovery; invalid entries are dropped. */
function recover(candidate: unknown): AppState {
  if (typeof candidate !== "object" || candidate === null) return INITIAL_STATE
  const obj = candidate as Record<string, unknown>

  const entries: Record<string, DayEntry> = {}
  if (obj.entries && typeof obj.entries === "object") {
    for (const [key, value] of Object.entries(obj.entries as Record<string, unknown>)) {
      const parsed = DayEntrySchema.safeParse(value)
      if (parsed.success) entries[key] = parsed.data
    }
  }

  const habits = z.array(HabitSchema).safeParse(obj.habits)
  const morning = TimeOfDaySchema.safeParse(obj.notificationMorning)
  const evening = TimeOfDaySchema.safeParse(obj.notificationEvening)

  return {
    entries,
    habits: habits.success ? habits.data : INITIAL_STATE.habits,
    notificationMorning: morning.success ? morning.data : INITIAL_STATE.notificationMorning,
    notificationEvening: evening.success ? evening.data : INITIAL_STATE.notificationEvening,
  }
}
