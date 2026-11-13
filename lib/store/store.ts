"use client"

import {
  ANON_STORAGE_KEY,
  AppState,
  AUTHED_STORAGE_KEY_PREFIX,
  INITIAL_STATE,
  LEGACY_STORAGE_KEY,
  STATE_VERSION,
  authedStorageKey,
  migrateWithMeta,
} from "./state"
import { validateJournal } from "./native-storage"
import { JournalDraftsSchema, type JournalDraft } from "./journal-draft"
import { localStorageAdapter, type StoragePort } from "./persistence"

/**
 * Tiny reactive store built on the `useSyncExternalStore` contract.
 *
 * Snapshots are synchronous (required by React). The server snapshot is
 * always `INITIAL_STATE` so SSR is deterministic. The client hydrates from
 * storage after mount so the first client render matches the server HTML.
 */

let storage: StoragePort = localStorageAdapter
let flushDevice: (() => Promise<boolean>) | null = null
let retryDevice: (() => Promise<boolean>) | null = null

/** Install before mounting auth, sync or any journal consumers. */
export function installDeviceStorage(
  adapter: StoragePort,
  flush: () => Promise<boolean>,
  retry: () => Promise<boolean> = flush
): void {
  storage = adapter
  flushDevice = flush
  retryDevice = retry
  state = INITIAL_STATE
  habitsRecoveredInvalid = false
  hydrated = false
}

/** Native writes are asynchronous; user-facing save success must await this. */
export async function flushDeviceStorage(): Promise<boolean> {
  return flushDevice ? flushDevice() : true
}

/**
 * Retry a failed native write; outside native, persist locally instead.
 */
export async function retryDeviceStorage(): Promise<boolean> {
  return retryDevice ? retryDevice() : persistLocal()
}

let state: AppState = INITIAL_STATE
const listeners = new Set<() => void>()
let hydrated = false
let cloudPersistence: ((state: AppState) => void) | null = null
/**
 * True while the in-memory `state.habits` came from recovering an invalid
 * `habits` container (missing or not an array — see `migrateWithMeta`).
 * Such habits are "unknown", not an intentional deletion, so inbound cloud
 * sync lets remote habits win instead of saving the recovered list.
 *
 * The flag survives unrelated edits (only an explicit `habits` change or a
 * cloud reconciliation clears it) and is persisted in the envelope
 * (`habitsRecoveredInvalid`) so a reload before cloud reconciliation keeps
 * treating the recovered list as unknown. `hydrate` re-derives it from the
 * container shape or the persisted marker.
 */
let habitsRecoveredInvalid = false

/** True when current local habits came from invalid-container recovery. */
export function localHabitsFromInvalidRecovery(): boolean {
  return habitsRecoveredInvalid
}

/**
 * Active storage slot. Anon and authed never share a slot, and every
 * authed user has their own slot keyed by id — see authedStorageKey.
 * SyncProvider is responsible for calling `setStorageScope` when auth
 * status changes (before any hydrate/persist this tick).
 */
let storageScope: "authed" | "anon" | "local" = "authed"
let authedUserId: string | null = null

/**
 * Resolve the storage slot for the active scope, or null while the
 * authed scope has no user id yet (callers must not read/write).
 */
function activeKey(): string | null {
  if (storageScope === "anon" || storageScope === "local")
    return ANON_STORAGE_KEY
  if (authedUserId) return authedStorageKey(authedUserId)
  // Authed scope with no user id yet: nothing to read/write. Callers must
  // set authedUserId via setStorageScope("authed", userId) before
  // hydrating; see SyncProvider.
  return null
}

/** Identity token for asynchronous editor completions and undo. */
export function getStorageIdentity(): string | null {
  return activeKey()
}

let draftRaw: string | null = null
let draftKey: string | null = null
let draftCache: Record<string, JournalDraft> = {}
const EMPTY_DRAFTS: Record<string, JournalDraft> = {}

/**
 * Parse and cache the active slot's journal drafts; corrupt or missing
 * data reads as empty. Re-parses only when the slot or raw text changes.
 */
export function getJournalDrafts(): Record<string, JournalDraft> {
  const key = activeKey()
  const raw = key ? storage.read(key) : null
  if (key === draftKey && raw === draftRaw) return draftCache
  draftKey = key
  draftRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : {}
    draftCache = JournalDraftsSchema.parse(parsed.localDrafts ?? {})
  } catch {
    draftCache = EMPTY_DRAFTS
  }
  return draftCache
}

export function getServerDrafts() {
  return EMPTY_DRAFTS
}

/**
 * Write one journal draft (or delete it with null) into the active
 * slot's envelope, validating the stored state first. Returns false
 * when no slot is active, the stored state is invalid, or the write
 * fails.
 */
export function saveJournalDraft(
  context: string,
  draft: JournalDraft | null
): boolean {
  hydrateFromStorage()
  const key = activeKey()
  if (!key) return false
  try {
    const original = storage.read(key)
    if (original !== null) validateJournal(original)
  } catch {
    return false
  }
  const drafts = { ...getJournalDrafts() }
  if (draft) drafts[context] = draft
  else delete drafts[context]
  if (!JournalDraftsSchema.safeParse(drafts).success) return false
  if (
    !storage.write(
      key,
      JSON.stringify({
        version: STATE_VERSION,
        data: state,
        localDrafts: drafts,
        ...(habitsRecoveredInvalid ? { habitsRecoveredInvalid: true } : {}),
      })
    )
  )
    return false
  notify()
  return true
}

function serializedState(next: AppState): string {
  return JSON.stringify({
    version: STATE_VERSION,
    data: next,
    localDrafts: getJournalDrafts(),
    // Persist the recovery marker so a reload before cloud reconciliation
    // keeps treating recovered habits as "unknown", not as an intentional
    // deletion. See localHabitsFromInvalidRecovery.
    ...(habitsRecoveredInvalid ? { habitsRecoveredInvalid: true } : {}),
  })
}

/**
 * One-time migration of the pre-scope-split anchor-state key into the
 * local-only slot; every other scope treats the legacy key as unowned
 * and drops it (privacy boundary — see LEGACY_STORAGE_KEY).
 */
function migrateLegacyIfPresent(): void {
  // One-time migration from the pre-scope-split single `anchor-state`
  // key into the local-only slot. The legacy envelope had
  // the same shape ({ version, data }) or was the raw AppState itself;
  // `migrate` already handles both. Runs at most once per browser: after
  // we move the data we delete the legacy key.
  //
  // Privacy note: only the unconfigured/local-only path migrates legacy
  // data. Authenticated and anonymous auth flows treat the legacy key as
  // unowned because it may have belonged to a previous account on a shared
  // device; importing it into a user slot or anon slot could leak private
  // journal entries into the next signer's cloud row.
  if (storageScope !== "local") {
    storage.remove(LEGACY_STORAGE_KEY)
    return
  }
  const raw = storage.read(LEGACY_STORAGE_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    const migrated = migrateWithMeta(parsed)
    state = migrated.state
    habitsRecoveredInvalid =
      migrated.meta.habitsContainerInvalid ||
      (typeof parsed === "object" &&
        parsed !== null &&
        parsed.habitsRecoveredInvalid === true)
    if (persistLocal()) {
      storage.remove(LEGACY_STORAGE_KEY)
    }
  } catch {
    // Corrupt legacy entry: drop it so the migration does not retry on
    // every reload and so the user gets a clean initial state.
    storage.remove(LEGACY_STORAGE_KEY)
  }
}

/**
 * Load the active slot's envelope into memory, re-deriving the
 * recovered-unknown habits flag from the container shape or the
 * persisted marker.
 */
function hydrate(): void {
  habitsRecoveredInvalid = false
  const key = activeKey()
  if (!key) return
  const raw = storage.read(key)
  if (!raw) {
    // No data in the current scope yet. If a legacy `anchor-state` entry
    // exists, migrate it only for the local-only scope. Anonymous and
    // authenticated auth scopes treat legacy data as unowned and may drop
    // it without importing across a privacy boundary.
    migrateLegacyIfPresent()
    return
  }
  try {
    const parsed = JSON.parse(raw)
    const migrated = migrateWithMeta(parsed)
    state = migrated.state
    // Re-derive from the container shape, or keep a previously persisted
    // recovery marker so a reload before reconciliation preserves "unknown".
    habitsRecoveredInvalid =
      migrated.meta.habitsContainerInvalid ||
      (typeof parsed === "object" &&
        parsed !== null &&
        parsed.habitsRecoveredInvalid === true)
  } catch {
    state = INITIAL_STATE
    habitsRecoveredInvalid = false
  }
  // The active scope already had data — never touch state from a
  // legacy key in this branch; that would clobber the user's current
  // progress. We do still drop a stray legacy entry so future deploys
  // do not re-read it.
  storage.remove(LEGACY_STORAGE_KEY)
}

/**
 * Serialize the current state into the active slot; false when no
 * slot is active.
 */
function persistLocal(): boolean {
  const key = activeKey()
  if (!key) return false
  return storage.write(key, serializedState(state))
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

/**
 * Read storage once per page load (first call wins) and notify
 * listeners only when hydration changed the state.
 */
export function hydrateFromStorage(): void {
  if (hydrated) return
  hydrated = true
  const previous = state
  hydrate()
  if (state !== previous) {
    notify()
  }
}

/** True once the first hydrateFromStorage() has run on this page load. */
export function isHydrated(): boolean {
  return hydrated
}

/**
 * Clear the "already hydrated" guard so the next `hydrateFromStorage()` call
 * re-reads from storage. Used after `resetState()` on authed→anon transitions
 * so a subsequent sign-in re-hydrates from the (now empty) store cleanly.
 */
export function forceRehydrate(): void {
  hydrated = false
}

export function setState(updater: (prev: AppState) => AppState): void {
  replaceState(updater(state))
}

/** Commit to the active slot; native callers also await flushDeviceStorage. */
export function commitLocalState(
  updater: (prev: AppState) => AppState
): boolean {
  hydrateFromStorage()
  const key = activeKey()
  if (!key) return false
  const next = updater(state)
  // Only an explicit habits change turns recovered "unknown" habits into a
  // local intent; an unrelated edit (e.g. a journal entry during the initial
  // cloud load) must preserve the recovery flag so sync still lets remote
  // habits win.
  const habitsChanged = next.habits !== state.habits
  if (habitsChanged) habitsRecoveredInvalid = false
  if (!storage.write(key, serializedState(next))) {
    // Keep the safe side of the distinction on a failed write: a just-made
    // explicit change re-arms "unknown" (remote wins) rather than risking a
    // recovered empty list overwriting cloud habits.
    if (habitsChanged) habitsRecoveredInvalid = true
    return false
  }
  state = next
  notify()
  // While habits remain "unknown" (invalid-container recovery), an early
  // push would publish the recovered list against the pre-reconcile cloud
  // version; defer to inbound reconciliation, which performs one clean save
  // once the unknown habits are resolved.
  if (!habitsRecoveredInvalid) cloudPersistence?.(state)
  return true
}

/**
 * Swap the whole state and persist locally. Cloud echo is optional
 * and suppressed while recovered habits remain "unknown" — an
 * explicit habits change or a cloud reconciliation resolves it
 * (mirrors commitLocalState).
 */
export function replaceState(
  nextState: AppState,
  options: { persistCloud?: boolean; habitsReconciled?: boolean } = {}
): void {
  // Mirror commitLocalState's distinction: an unrelated edit (habits
  // untouched by reference) preserves the recovered-"unknown" marker, so a
  // journal or notification edit routed through setState during the initial
  // cloud load cannot turn recovered habits into a local intent. An explicit
  // habits change — or a cloud reconciliation (options.habitsReconciled) —
  // resolves the unknown.
  const habitsChanged = nextState.habits !== state.habits
  if (habitsChanged || options.habitsReconciled) habitsRecoveredInvalid = false
  state = nextState
  persistLocal()
  // While habits remain "unknown", pushing this state would publish the
  // recovered list against the pre-reconcile cloud version. Inbound
  // reconciliation resolves the unknown and then performs one clean save.
  if (options.persistCloud !== false && !habitsRecoveredInvalid) {
    cloudPersistence?.(state)
  }
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
  scope: "authed" | "anon" | "local",
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
    if (storageScope === scope) return
    storageScope = scope
    authedUserId = null
  }
  state = INITIAL_STATE
  habitsRecoveredInvalid = false
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

/**
 * Remove every persisted authenticated slot. Used when the app enters an
 * anonymous/local-only state and the previous user id is unavailable (fresh
 * tab, expired session, or external logout). This protects private journals
 * at rest on shared devices instead of relying only on an in-memory ref.
 */
export function clearAllAuthedSlots(): void {
  for (const key of storage.keys()) {
    if (key.startsWith(AUTHED_STORAGE_KEY_PREFIX)) storage.remove(key)
  }
  if (storageScope === "authed") {
    state = INITIAL_STATE
    hydrated = false
    notify()
  }
}

/**
 * Reset in-memory state to INITIAL_STATE and wipe the active slot's
 * stored data.
 */
export function resetState(): void {
  state = INITIAL_STATE
  habitsRecoveredInvalid = false
  const key = activeKey()
  if (key) storage.remove(key)
  notify()
}

export function setCloudPersistence(persist: (state: AppState) => void): void {
  cloudPersistence = persist
}

export function clearCloudPersistence(): void {
  cloudPersistence = null
}
