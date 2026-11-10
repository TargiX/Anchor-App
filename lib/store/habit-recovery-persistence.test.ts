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

    // replaceState with habitsReconciled is the reconciliation path: habits
    // become known even when the replacement list equals the recovered one.
    store.replaceState({ ...INITIAL_STATE }, {
      persistCloud: false,
      habitsReconciled: true,
    })
    expect(store.localHabitsFromInvalidRecovery()).toBe(false)
  })

  it("survives an unrelated setState edit routed through replaceState", () => {
    disk.set(ANON_STORAGE_KEY, recoveredEnvelope("not-an-array"))
    store.hydrateFromStorage()
    expect(store.localHabitsFromInvalidRecovery()).toBe(true)

    // updateEntry / setNotificationTime go through setState → replaceState;
    // habits are untouched by reference, so the marker must survive.
    store.setState((prev) => ({
      ...prev,
      notificationMorning: "07:00",
      entries: {
        ...prev.entries,
        "2026-01-01": {
          date: "2026-01-01",
          journal: "Edited during the initial cloud load",
        },
      },
    }))
    expect(store.localHabitsFromInvalidRecovery()).toBe(true)
    expect(
      JSON.parse(disk.get(ANON_STORAGE_KEY) ?? "{}").habitsRecoveredInvalid
    ).toBe(true)
  })
})

describe("recovered-habits cloud-save deferral", () => {
  it("defers cloud persistence while habits are unknown and resumes on an explicit habits change", () => {
    disk.set(ANON_STORAGE_KEY, recoveredEnvelope("not-an-array"))
    store.hydrateFromStorage()
    expect(store.localHabitsFromInvalidRecovery()).toBe(true)

    const pushed: unknown[] = []
    store.setCloudPersistence((state) => pushed.push(state))

    // Unrelated check-in edit: an early push would publish the recovered
    // habits against the pre-reconcile cloud version, so nothing is queued.
    store.commitLocalState((prev) => ({
      ...prev,
      entries: {
        ...prev.entries,
        "2026-01-01": {
          date: "2026-01-01",
          journal: "Written while the inbound load was pending",
        },
      },
    }))
    expect(pushed).toHaveLength(0)

    // Reconciliation replaces the state (persistCloud disabled) and resolves
    // the unknown habits.
    store.replaceState(
      (store.getSnapshot()),
      { persistCloud: false, habitsReconciled: true }
    )
    expect(store.localHabitsFromInvalidRecovery()).toBe(false)

    // With the unknown resolved, ordinary edits push to cloud persistence.
    store.commitLocalState((prev) => ({
      ...prev,
      notificationEvening: "21:30",
    }))
    expect(pushed).toHaveLength(1)
  })
})
