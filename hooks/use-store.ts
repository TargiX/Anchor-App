"use client"

import { useSyncExternalStore } from "react"
import {
  getState,
  subscribe,
  getTodayEntry,
  updateTodayEntry,
  setState,
  type AppState,
  type DayEntry,
} from "@/lib/store"

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState)
}

export function useTodayEntry(): DayEntry {
  const state = useAppState()
  const key = new Date().toISOString().split("T")[0]
  return state.entries[key] ?? { date: key }
}

export { getTodayEntry, updateTodayEntry, setState }
