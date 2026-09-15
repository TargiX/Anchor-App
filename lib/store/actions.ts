"use client"

import { commitLocalState, getSnapshot, replaceState, setState } from "./store"
import { QuickCheckInSchema } from "@/lib/domain/quick-checkin"
import type { AppState } from "./state"
import { getTodayKey } from "@/lib/time/today"
import {
  DayKeySchema,
  emptyEntry,
  TimeOfDaySchema,
  type DayKey,
  type DayEntry,
} from "@/lib/domain/entry"
import type { Habit } from "@/lib/domain/habit"
import {
  LIMITS,
  validateHabitName,
  type ValidationResult,
} from "@/lib/domain/validation"

/**
 * The only sanctioned way to mutate state. Components call these, never
 * `setState` directly — so every mutation has a name and lives in one place.
 */

/** Apply a cloud refetch locally without echoing it back to cloud persistence. */
export function applyInboundCloudState(state: AppState): void {
  replaceState(state, { persistCloud: false })
}

/** Merge a patch into one local-day entry, creating it if needed. */
export function updateEntry(key: DayKey, patch: Partial<DayEntry>): void {
  if (!DayKeySchema.safeParse(key).success) return
  const safePatch = { ...patch }
  delete safePatch.date
  setState((prev) => ({
    ...prev,
    entries: {
      ...prev.entries,
      [key]: {
        ...(prev.entries[key] ?? emptyEntry(key)),
        ...safePatch,
        date: key,
      },
    },
  }))
}

/** Merge a patch into today's entry, creating it if needed. */
export function updateTodayEntry(patch: Partial<DayEntry>): void {
  updateEntry(getTodayKey(), patch)
}

/** Append a check-in without replacing journal text or earlier check-ins. */
export function saveQuickCheckIn(
  input: unknown,
  key = getTodayKey()
): ValidationResult {
  const parsed = QuickCheckInSchema.safeParse(input)
  if (!parsed.success || !DayKeySchema.safeParse(key).success) {
    return {
      ok: false,
      error: "Add a short note and keep your next step under 200 characters.",
    }
  }
  const checkIn = parsed.data
  const saved = commitLocalState((previous) => {
    const entry = previous.entries[key] ?? emptyEntry(key)
    if (entry.quickCheckIns?.some((item) => item.id === checkIn.id))
      return previous
    return {
      ...previous,
      entries: {
        ...previous.entries,
        [key]: {
          ...entry,
          quickCheckIns: [...(entry.quickCheckIns ?? []), checkIn],
          ...(checkIn.nextStep ? { intention: checkIn.nextStep } : {}),
        },
      },
    }
  })
  return saved
    ? { ok: true }
    : {
        ok: false,
        error:
          "Could not save on this device. Your text is still here. Free up storage or copy it before leaving, then try again.",
      }
}

type RitualKind = "morning" | "evening"

const cursorFieldByKind = {
  morning: "morningRitualStep",
  evening: "eveningRitualStep",
} as const

function isValidRitualStep(kind: RitualKind, step: number): boolean {
  const totalSteps =
    kind === "morning" ? LIMITS.morningRitualSteps : LIMITS.eveningRitualSteps
  return Number.isInteger(step) && step >= 0 && step < totalSteps
}

/** Persist an unfinished ritual screen for the selected local calendar entry. */
export function setRitualCursor(
  kind: RitualKind,
  step: number,
  entryKey: DayKey = getTodayKey()
): void {
  if (!isValidRitualStep(kind, step)) return
  updateEntry(entryKey, { [cursorFieldByKind[kind]]: step })
}

/** Remove an unfinished cursor after the ritual reaches its completion screen. */
export function clearRitualCursor(
  kind: RitualKind,
  entryKey: DayKey = getTodayKey()
): void {
  if (!DayKeySchema.safeParse(entryKey).success) return
  const field = cursorFieldByKind[kind]
  setState((prev) => {
    const entry = prev.entries[entryKey]
    if (!entry || !(field in entry)) return prev
    const withoutCursor = { ...entry }
    delete withoutCursor[field]
    return {
      ...prev,
      entries: { ...prev.entries, [entryKey]: withoutCursor },
    }
  })
}

function newHabitId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now())
}

/** Validates against current habits; returns why it failed so the UI can show it. */
export function addHabit(name: string): ValidationResult {
  const result = validateHabitName(name, getSnapshot().habits)
  if (!result.ok) return result
  const habit: Habit = { id: newHabitId(), name: name.trim(), icon: "circle" }
  setState((prev) => ({ ...prev, habits: [...prev.habits, habit] }))
  return { ok: true }
}

export function removeHabit(id: string): void {
  setState((prev) => ({
    ...prev,
    habits: prev.habits.filter((h) => h.id !== id),
  }))
}

export function setNotificationTime(
  which: "morning" | "evening",
  time: string
): void {
  const parsed = TimeOfDaySchema.safeParse(time)
  if (!parsed.success) return
  const field =
    which === "morning" ? "notificationMorning" : "notificationEvening"
  setState((prev) => ({ ...prev, [field]: parsed.data }))
}
