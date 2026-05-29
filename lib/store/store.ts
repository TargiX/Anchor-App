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
 * always `INITIAL_STATE` so SSR is deterministic; the client hydrates from
 * storage on first import and React reconciles the difference.
 */

const storage: StoragePort = localStorageAdapter

let storageKey = STORAGE_KEY
let state: AppState = INITIAL_STATE
const listeners = new Set<() => void>()

function hydrate(): void {
  const raw = storage.read(storageKey)
  if (!raw) {
    state = INITIAL_STATE
    return
  }
  try {
    state = migrate(JSON.parse(raw))
  } catch {
    state = INITIAL_STATE
  }
}

function persist(): void {
  storage.write(
    storageKey,
    JSON.stringify({ version: STATE_VERSION, data: state })
  )
}

function emit(): void {
  listeners.forEach((listener) => listener())
}

function scopedStorageKey(scope: string | null): string {
  return scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY
}

/**
 * Switch the persisted state namespace.
 *
 * `null` keeps the legacy/local-only bucket. Authenticated sessions use a
 * user-specific scope so accounts sharing one device never see each other's
 * local cache.
 */
export function setStorageScope(scope: string | null): void {
  const nextKey = scopedStorageKey(scope)
  if (nextKey === storageKey) return
  storageKey = nextKey
  hydrate()
  emit()
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

export function setState(updater: (prev: AppState) => AppState): void {
  state = updater(state)
  persist()
  emit()
}

// Hydrate once on the client at module load.
if (typeof window !== "undefined") {
  hydrate()
}
