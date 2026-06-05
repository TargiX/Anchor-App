"use client"

import { getSnapshot, setState } from "./store"
import { getTodayKey } from "@/lib/time/today"
import { emptyEntry, TimeOfDaySchema, type DayEntry } from "@/lib/domain/entry"
import type { Habit } from "@/lib/domain/habit"
import { validateHabitName, type ValidationResult } from "@/lib/domain/validation"

/**
 * The only sanctioned way to mutate state. Components call these, never
 * `setState` directly — so every mutation has a name and lives in one place.
 */

/** Merge a patch into today's entry, creating it if needed. */
export function updateTodayEntry(patch: Partial<DayEntry>): void {
  const key = getTodayKey()
  const { date: _ignoredDate, ...safePatch } = patch
  setState((prev) => ({
    ...prev,
    entries: {
      ...prev.entries,
      [key]: { ...(prev.entries[key] ?? emptyEntry(key)), ...safePatch, date: key },
    },
  }))
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
  setState((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== id) }))
}

export function setNotificationTime(which: "morning" | "evening", time: string): void {
  const parsed = TimeOfDaySchema.safeParse(time)
  if (!parsed.success) return
  const field = which === "morning" ? "notificationMorning" : "notificationEvening"
  setState((prev) => ({ ...prev, [field]: parsed.data }))
}
