"use client"

import {
  ANON_STORAGE_KEY,
  AppState,
  INITIAL_STATE,
  STATE_VERSION,
  STORAGE_KEY,
  migrate,
} from "./state"
import { localStorageAdapter, type StoragePort } from "./persistence"

/**
 * Tiny reactive store built on the `useSyncExternalStore` contract.
 *
 * Snapshots are synchronous (required by React). The server snapshot is
 * always `INITIAL_STATE` so SSR is deterministic. The client hydrates from
 * storage after mount so the first client render matches the server HTML.
 */

const storage: StoragePort = localStorageAdapter

let state: AppState = INITIAL_STATE
const listeners = new Set<() => void>()
let hydrated = false
let cloudPersistence: ((state: AppState) => void) | null = null

/**
 * Active storage slot. Anon and authed never share a slot — see STORAGE_KEY /
 * ANON_STORAGE_KEY. SyncProvider is responsible for calling `setStorageScope`
 * when auth status changes (before any hydrate/persist this tick).
 */
let storageScope: "authed" | "anon" = "authed"

function activeKey(): string {
  return storageScope === "anon" ? ANON_STORAGE_KEY : STORAGE_KEY
}

function hydrate(): void {
  const raw = storage.read(activeKey())
  if (!raw) return
  try {
    state = migrate(JSON.parse(raw))
  } catch {
    state = INITIAL_STATE
  }
}

function persistLocal(): void {
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
 * Switch the persistence slot. Resets in-memory state and the hydrated guard
 * so the next `hydrateFromStorage` reads the new scope. When entering the
 * `anon` scope we also wipe the anon slot — defensive against shared devices
 * where a previous anon visitor's local progress must not leak to the next
 * fresh visitor. We never wipe the `authed` slot: a returning authed user
 * must see their own persisted state.
 */
export function setStorageScope(scope: "authed" | "anon"): void {
  if (storageScope === scope) return
  const target = scope
  storageScope = scope
  state = INITIAL_STATE
  hydrated = false
  if (target === "anon") {
    storage.remove(ANON_STORAGE_KEY)
  }
  notify()
}

export function resetState(): void {
  state = INITIAL_STATE
  storage.remove(activeKey())
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
