"use client"

import { getLocalTodayKey } from "@/lib/time/today"

// Local in-memory store using a simple reactive pattern.
// In a production app this would be backed by Supabase or similar.

export type SleepQuality = "terrible" | "poor" | "okay" | "good" | "great"

export type MoodPoint = { energy: number; valence: number } // both 0–1

export interface DayEntry {
  date: string // ISO date string YYYY-MM-DD
  morningMood?: MoodPoint
  eveningMood?: MoodPoint
  sleepQuality?: SleepQuality
  sleepHours?: number
  intention?: string
  journal?: string
  affirmation?: string
  habitsCompleted?: string[]
  meditationMinutes?: number
  tomorrowBedtime?: string
  tomorrowSleepHours?: number
}

export interface Habit {
  id: string
  name: string
  icon: string
}

export interface AppState {
  entries: Record<string, DayEntry>
  habits: Habit[]
  streak: number
  theme: "light" | "dark" | "sepia"
  focusAreas: string[]
  notificationMorning: string
  notificationEvening: string
}

const DEFAULT_HABITS: Habit[] = [
  { id: "1", name: "Move my body", icon: "footprints" },
  { id: "2", name: "Drink water", icon: "droplets" },
  { id: "3", name: "Read", icon: "book-open" },
  { id: "4", name: "No screens before bed", icon: "moon" },
]

const INITIAL_STATE: AppState = {
  entries: {},
  habits: DEFAULT_HABITS,
  streak: 4,
  theme: "light",
  focusAreas: ["clarity", "rest", "creativity"],
  notificationMorning: "08:00",
  notificationEvening: "20:00",
}

function loadState(): AppState {
  if (typeof window === "undefined") return INITIAL_STATE
  try {
    const raw = localStorage.getItem("anchor-state")
    if (!raw) return INITIAL_STATE
    return { ...INITIAL_STATE, ...JSON.parse(raw) }
  } catch {
    return INITIAL_STATE
  }
}

function saveState(state: AppState) {
  if (typeof window === "undefined") return
  localStorage.setItem("anchor-state", JSON.stringify(state))
}

let _state = INITIAL_STATE
let _listeners: Array<() => void> = []

function getState(): AppState {
  return _state
}

function setState(updater: (prev: AppState) => AppState) {
  _state = updater(_state)
  saveState(_state)
  _listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  _listeners.push(listener)
  return () => {
    _listeners = _listeners.filter((l) => l !== listener)
  }
}

// Initialize from localStorage on first import (client only)
if (typeof window !== "undefined") {
  _state = loadState()
}

export function getTodayKey() {
  return getLocalTodayKey()
}

export function getTodayEntry(): DayEntry {
  const key = getTodayKey()
  return _state.entries[key] ?? { date: key }
}

export function updateTodayEntry(patch: Partial<DayEntry>) {
  const key = getTodayKey()
  setState((prev) => ({
    ...prev,
    entries: {
      ...prev.entries,
      [key]: { ...getTodayEntry(), ...patch },
    },
  }))
}

export function getAppState() {
  return { getState, setState, subscribe, getTodayEntry, updateTodayEntry }
}

export { getState, setState, subscribe }
