"use client"

import {
  AppState,
  INITIAL_STATE,
  STATE_VERSION,
  STORAGE_KEY,
  migrate,
} from "./state"
import type { DailyReview } from "@/lib/domain/daily-review"
import { localStorageAdapter, type StoragePort } from "./persistence"

export type DailyReviewUiState = {
  review: DailyReview | null
  reviewError: string | null
  reviewLoading: boolean
}

const INITIAL_DAILY_REVIEW_UI: DailyReviewUiState = {
  review: null,
  reviewError: null,
  reviewLoading: false,
}

/**
 * Tiny reactive store built on the `useSyncExternalStore` contract.
 *
 * Snapshots are synchronous (required by React). The server snapshot is
 * always `INITIAL_STATE` so SSR is deterministic. The client hydrates from
 * storage after mount so the first client render matches the server HTML.
 */

const storage: StoragePort = localStorageAdapter

let state: AppState = INITIAL_STATE
let dailyReviewUi: DailyReviewUiState = INITIAL_DAILY_REVIEW_UI
const listeners = new Set<() => void>()
let hydrated = false
let cloudPersistence: ((state: AppState) => void) | null = null

function hydrate(): void {
  const raw = storage.read(STORAGE_KEY)
  if (!raw) return
  try {
    state = migrate(JSON.parse(raw))
  } catch {
    state = INITIAL_STATE
  }
}

function persistLocal(): void {
  storage.write(
    STORAGE_KEY,
    JSON.stringify({ version: STATE_VERSION, data: state })
  )
}

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): AppState {
  return state
}

export function getServerSnapshot(): AppState {
  return INITIAL_STATE
}

export function getDailyReviewUiSnapshot(): DailyReviewUiState {
  return dailyReviewUi
}

export function getDailyReviewUiServerSnapshot(): DailyReviewUiState {
  return INITIAL_DAILY_REVIEW_UI
}

export function setDailyReviewUiState(
  updater: (prev: DailyReviewUiState) => DailyReviewUiState
): void {
  dailyReviewUi = updater(dailyReviewUi)
  notify()
}

export function hydrateFromStorage(): void {
  if (hydrated) return
  hydrated = true
  const previous = state
  hydrate()
  if (state !== previous) {
    notify()
  }
}

export function setState(updater: (prev: AppState) => AppState): void {
  replaceState(updater(state))
}

export function replaceState(
  nextState: AppState,
  options: { persistCloud?: boolean } = {}
): void {
  state = nextState
  persistLocal()
  if (options.persistCloud !== false) cloudPersistence?.(state)
  notify()
}

export function resetState(): void {
  state = INITIAL_STATE
  storage.remove(STORAGE_KEY)
  notify()
}

export function setCloudPersistence(
  persist: (state: AppState) => void
): void {
  cloudPersistence = persist
}

export function clearCloudPersistence(): void {
  cloudPersistence = null
}
