"use client"

import { useSyncExternalStore } from "react"
import { subscribe, getSnapshot, getServerSnapshot } from "@/lib/store/store"
import type { AppState } from "@/lib/store/state"
import { emptyEntry, type DayEntry } from "@/lib/domain/entry"
import { computeStreak } from "@/lib/domain/selectors"
import { getTodayKey } from "@/lib/time/today"

/** Subscribe a component to the whole app state. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Today's entry (or an empty one for today if none exists yet). */
export function useTodayEntry(): DayEntry {
  const state = useAppState()
  const key = getTodayKey()
  return state.entries[key] ?? emptyEntry(key)
}

/** Current consecutive-day streak, derived from entries. */
export function useStreak(): number {
  const state = useAppState()
  return computeStreak(state.entries)
}
