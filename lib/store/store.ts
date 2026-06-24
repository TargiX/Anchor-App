"use client"

import {
  ANON_STORAGE_KEY,
  AppState,
  INITIAL_STATE,
  LEGACY_STORAGE_KEY,
  STATE_VERSION,
  authedStorageKey,
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

/**
 * Active storage slot. Anon and authed never share a slot, and every
 * authed user has their own slot keyed by id — see authedStorageKey.
 * SyncProvider is responsible for calling `setStorageScope` when auth
 * status changes (before any hydrate/persist this tick).
 */
let storageScope: "authed" | "anon" = "authed"
let authedUserId: string | null = null

function activeKey(): string {
  if (storageScope === "anon") return ANON_STORAGE_KEY
  if (authedUserId) return authedStorageKey(authedUserId)
  // Authed scope with no user id yet: nothing to read/write. Callers must
  // set authedUserId via setStorageScope("authed", userId) before
  // hydrating; see SyncProvider.
  return ANON_STORAGE_KEY
}

function hasActiveKey(): boolean {
  return storageScope === "anon" || authedUserId !== null
}

function migrateLegacyIfPresent(): void {
  // One-time migration from the pre-scope-split single `anchor-state`
  // key into the active scope's slot. The legacy envelope had the same
  // shape ({ version, data }) or was the raw AppState itself; `migrate`
  // already handles both. Runs at most once per browser: after we move
  // the data we delete the legacy key.
  const raw = storage.read(LEGACY_STORAGE_KEY)
  if (!raw) return
  try {
    state = migrate(JSON.parse(raw))
    persistLocal()
    storage.remove(LEGACY_STORAGE_KEY)
  } catch {
    // Corrupt legacy entry: drop it so the migration does not retry on
    // every reload and so the user gets a clean initial state.
    storage.remove(LEGACY_STORAGE_KEY)
  }
}

function hydrate(): void {
  if (!hasActiveKey()) return
  const raw = storage.read(activeKey())
  if (!raw) {
    // No data in the current scope yet. If a legacy `anchor-state` entry
    // exists, fold it into the active scope exactly once and stop.
    migrateLegacyIfPresent()
    return
  }
  try {
    state = migrate(JSON.parse(raw))
  } catch {
    state = INITIAL_STATE
  }
  // The active scope already had data — never touch state from a
  // legacy key in this branch; that would clobber the user's current
  // progress. We do still drop a stray legacy entry so future deploys
  // do not re-read it.
  storage.remove(LEGACY_STORAGE_KEY)
}

function persistLocal(): void {
  if (!hasActiveKey()) return
  storage.write(
    activeKey(),
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

/**
 * Switch the persistence slot. Resets in-memory state and the hydrated
 * guard so the next `hydrateFromStorage` reads the new scope. Storage
 * isolation is already provided by `activeKey()` reading distinct keys
 * per (scope, userId); this function intentionally does NOT clear storage
 * itself — callers that need a fresh start (e.g. anon visitors must not
 * see a previous anon visitor's local progress on a shared device) own
 * that decision via `resetAnonSlot()` / `clearAuthedSlot()`.
 *
 * Entering `anon` requires no user id; entering `authed` requires
 * `userId` so the slot is keyed per-user — a previous authed user's
 * state can never leak into a different authed user's slot.
 */
export function setStorageScope(
  scope: "authed" | "anon",
  userId?: string | null
): void {
  if (scope === "authed") {
    if (!userId) {
      throw new Error("setStorageScope('authed', …) requires a userId")
    }
    if (storageScope === "authed" && authedUserId === userId) return
    storageScope = "authed"
    authedUserId = userId
  } else {
    if (storageScope === "anon") return
    storageScope = "anon"
    authedUserId = null
  }
  state = INITIAL_STATE
  hydrated = false
  notify()
}

/**
 * Wipe the anon localStorage slot AND reset the in-memory state back to
 * INITIAL_STATE so the next `hydrateFromStorage()` reads a clean slot.
 * Call this on `authed → anon` sign-out (or any time a fresh anon
 * visitor is expected) so a previous anonymous visitor's local progress
 * cannot leak to the next fresh visitor on a shared device.
 *
 * Safe to call when the active scope is not anon — only the anon slot
 * is touched and the in-memory reset is skipped if we're in an authed
 * scope (that scope's state is intentionally preserved).
 */
export function resetAnonSlot(): void {
  storage.remove(ANON_STORAGE_KEY)
  if (storageScope === "anon") {
    state = INITIAL_STATE
    hydrated = false
    notify()
  }
}

/**
 * Wipe a specific authed user's localStorage slot AND reset the
 * in-memory state if that user is currently the active authed scope, so
 * a sign-out clears the signing-out user's local progress without
 * affecting any other authed user's slot. Always clears storage for the
 * named user (so it is safe to call on sign-out from the authed scope).
 */
export function clearAuthedSlot(userId: string): void {
  storage.remove(authedStorageKey(userId))
  if (storageScope === "authed" && authedUserId === userId) {
    state = INITIAL_STATE
    hydrated = false
    notify()
  }
}

export function resetState(): void {
  state = INITIAL_STATE
  if (hasActiveKey()) storage.remove(activeKey())
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
