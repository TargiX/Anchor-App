"use client"

import { getSnapshot, replaceState, setState } from "./store"
import type { AppState } from "./state"
import { getTodayKey } from "@/lib/time/today"
import {
  DayKeySchema,
  emptyEntry,
  TimeOfDaySchema,
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
export function updateEntry(key: string, patch: Partial<DayEntry>): void {
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
  entryKey = getTodayKey()
): void {
  if (!isValidRitualStep(kind, step)) return
  updateEntry(entryKey, { [cursorFieldByKind[kind]]: step })
}

/** Remove an unfinished cursor after the ritual reaches its completion screen. */
export function clearRitualCursor(
  kind: RitualKind,
  entryKey = getTodayKey()
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
