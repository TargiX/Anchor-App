"use client"

import {
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

function hydrate(): void {
  const raw = storage.read(STORAGE_KEY)
  if (!raw) return
  try {
    state = migrate(JSON.parse(raw))
  } catch {
    state = INITIAL_STATE
  }
}

function persist(): void {
  storage.write(
    STORAGE_KEY,
    JSON.stringify({ version: STATE_VERSION, data: state })
  )
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
    listeners.forEach((listener) => listener())
  }
}

export function setState(updater: (prev: AppState) => AppState): void {
  state = updater(state)
  persist()
  listeners.forEach((listener) => listener())
}
