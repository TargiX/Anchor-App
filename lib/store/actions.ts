"use client"

import { getSnapshot, replaceState, setState } from "./store"
import type { AppState } from "./state"
import { getTodayKey } from "@/lib/time/today"
import { emptyEntry, TimeOfDaySchema, type DayEntry } from "@/lib/domain/entry"
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

/** Merge a patch into today's entry, creating it if needed. */
export function updateTodayEntry(patch: Partial<DayEntry>): void {
  const key = getTodayKey()
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

/** Persist an unfinished ritual screen for today's local calendar entry. */
export function setRitualCursor(kind: RitualKind, step: number): void {
  if (!isValidRitualStep(kind, step)) return
  updateTodayEntry({ [cursorFieldByKind[kind]]: step })
}

/** Remove an unfinished cursor after the ritual reaches its completion screen. */
export function clearRitualCursor(kind: RitualKind): void {
  const key = getTodayKey()
  const field = cursorFieldByKind[kind]
  setState((prev) => {
    const entry = prev.entries[key]
    if (!entry || !(field in entry)) return prev
    const withoutCursor = { ...entry }
    delete withoutCursor[field]
    return {
      ...prev,
      entries: { ...prev.entries, [key]: withoutCursor },
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
