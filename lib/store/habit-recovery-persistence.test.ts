import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ANON_STORAGE_KEY, INITIAL_STATE, STATE_VERSION } from "./state"

/**
 * Regression coverage for the recovered-habits flag lifecycle.
 *
 * Habits recovered from an invalid container are "unknown", not an
 * intentional deletion. The flag must therefore survive unrelated local
 * edits and page reloads until reconciliation or an explicit habits change,
 * and an explicitly stored `habits: []` must keep its intentional-deletion
 * behavior across reloads.
 */

const recoveredEnvelope = (habits: unknown) =>
  JSON.stringify({
    version: STATE_VERSION,
    data: {
      ...INITIAL_STATE,
      entries: {
        "2026-01-01": { date: "2026-01-01", journal: "Keep this" },
      },
      habits,
    },
  })

let store: typeof import("./store")
let disk: Map<string, string>

beforeEach(async () => {
  vi.resetModules()
  store = await import("./store")
  disk = new Map()
  store.installDeviceStorage(
    {
      read: (key) => disk.get(key) ?? null,
      write: (key, value) => {
        disk.set(key, value)
        return true
      },
      keys: () => [...disk.keys()],
      remove: (key) => {
        disk.delete(key)
      },
    },
    async () => true
  )
  store.setStorageScope("anon")
})

afterEach(() => {
  store.resetState()
  store.forceRehydrate()
})

describe("recovered-habits flag lifecycle", () => {
  it("survives an unrelated local edit during the initial cloud load", () => {
    disk.set(ANON_STORAGE_KEY, recoveredEnvelope("not-an-array"))
    store.hydrateFromStorage()
    expect(store.localHabitsFromInvalidRecovery()).toBe(true)

    // Unrelated edit (notification change, habits untouched by reference).
    const saved = store.commitLocalState((prev) => ({
      ...prev,
      notificationMorning: "07:00",
    }))
    expect(saved).toBe(true)
    expect(store.localHabitsFromInvalidRecovery()).toBe(true)
    // The persisted envelope keeps the marker for a pre-reconciliation reload.
    expect(
      JSON.parse(disk.get(ANON_STORAGE_KEY) ?? "{}").habitsRecoveredInvalid
    ).toBe(true)
  })

  it("survives a reload before reconciliation via the persisted marker", () => {
    disk.set(ANON_STORAGE_KEY, recoveredEnvelope("not-an-array"))
    store.hydrateFromStorage()
    store.commitLocalState((prev) => ({
      ...prev,
      notificationEvening: "21:00",
    }))

    // Simulate a page reload: re-hydrate from the persisted envelope.
    store.forceRehydrate()
    store.hydrateFromStorage()
    expect(store.localHabitsFromInvalidRecovery()).toBe(true)
  })

  it("clears on an explicit habits change and stops persisting the marker", () => {
    disk.set(ANON_STORAGE_KEY, recoveredEnvelope("not-an-array"))
    store.hydrateFromStorage()
    expect(store.localHabitsFromInvalidRecovery()).toBe(true)

    const saved = store.commitLocalState((prev) => ({ ...prev, habits: [] }))
    expect(saved).toBe(true)
    expect(store.localHabitsFromInvalidRecovery()).toBe(false)
    expect(
      JSON.parse(disk.get(ANON_STORAGE_KEY) ?? "{}").habitsRecoveredInvalid
    ).toBeUndefined()

    // The deletion was intentional: a reload does not resurrect "unknown".
    store.forceRehydrate()
    store.hydrateFromStorage()
    expect(store.localHabitsFromInvalidRecovery()).toBe(false)
  })

  it("keeps an explicitly stored empty habits list intentional across reloads", () => {
    disk.set(ANON_STORAGE_KEY, recoveredEnvelope([]))
    store.hydrateFromStorage()
    expect(store.localHabitsFromInvalidRecovery()).toBe(false)

    store.commitLocalState((prev) => ({
      ...prev,
      notificationMorning: "07:30",
    }))
    store.forceRehydrate()
    store.hydrateFromStorage()
    expect(store.localHabitsFromInvalidRecovery()).toBe(false)
  })

  it("clears on a full state replacement (reconciliation intent)", () => {
    disk.set(ANON_STORAGE_KEY, recoveredEnvelope("not-an-array"))
    store.hydrateFromStorage()
    expect(store.localHabitsFromInvalidRecovery()).toBe(true)

    // replaceState is the reconciliation/reset path: habits become known.
    store.replaceState({ ...INITIAL_STATE }, { persistCloud: false })
    expect(store.localHabitsFromInvalidRecovery()).toBe(false)
  })
})
