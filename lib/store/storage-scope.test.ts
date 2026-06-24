import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  getSnapshot,
  hydrateFromStorage,
  replaceState,
  resetAnonSlot,
  resetState,
  setStorageScope,
} from "./store"
import {
  INITIAL_STATE,
  LEGACY_STORAGE_KEY,
  authedStorageKey,
  type AppState,
} from "./state"

const memStorage = new Map<string, string>()
const localStorageShim = {
  getItem: (k: string) => memStorage.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memStorage.set(k, v)
  },
  removeItem: (k: string) => {
    memStorage.delete(k)
  },
  get length() {
    return memStorage.size
  },
  key: () => null,
  clear() {
    memStorage.clear()
  },
}

const USER_A = "user-aaa"
const USER_B = "user-bbb"

beforeEach(() => {
  // @ts-expect-error polyfill localStorage for store.ts
  globalThis.window = { localStorage: localStorageShim }
  memStorage.clear()
  // Start each test from a known authed scope.
  setStorageScope("authed", USER_A)
  resetState()
})

afterEach(() => {
  // @ts-expect-error cleanup
  delete globalThis.window
  memStorage.clear()
  setStorageScope("authed", USER_A)
  resetState()
})

describe("storage scope isolation", () => {
  it("per-user authed slots never cross-contaminate", () => {
    setStorageScope("authed", USER_A)
    const aState: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-21": { date: "2026-06-21", journal: "user A journal" },
      },
    }
    replaceState(aState)
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]?.journal).toBe(
      "user A journal"
    )

    // Switch to a different authed user — must NOT see A's data.
    setStorageScope("authed", USER_B)
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]).toBeUndefined()

    // B writes their own progress.
    const bState: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-22": { date: "2026-06-22", journal: "user B journal" },
      },
    }
    replaceState(bState)
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-22"]?.journal).toBe(
      "user B journal"
    )
    expect(getSnapshot().entries["2026-06-21"]).toBeUndefined()

    // Returning to A reveals only A's data.
    setStorageScope("authed", USER_A)
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]?.journal).toBe(
      "user A journal"
    )
    expect(getSnapshot().entries["2026-06-22"]).toBeUndefined()
  })

  it("authed and anon state live in separate slots", () => {
    setStorageScope("authed", USER_A)
    const authed: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-21": { date: "2026-06-21", journal: "private journal" },
      },
    }
    replaceState(authed)
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]?.journal).toBe(
      "private journal"
    )

    // Switch to anon — must NOT expose the authed entry.
    setStorageScope("anon")
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]).toBeUndefined()
    expect(getSnapshot()).toEqual(INITIAL_STATE)

    // Visitor writes their own progress in the anon slot.
    const anon: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-22": { date: "2026-06-22", intention: "try a thing" },
      },
    }
    replaceState(anon)
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-22"]?.intention).toBe("try a thing")
    expect(getSnapshot().entries["2026-06-21"]).toBeUndefined()

    // Switching back to authed (same user) reveals only the authed data.
    setStorageScope("authed", USER_A)
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]?.journal).toBe(
      "private journal"
    )
    expect(getSnapshot().entries["2026-06-22"]).toBeUndefined()
  })

  it("resetAnonSlot wipes the anon slot so a fresh visitor starts clean", () => {
    setStorageScope("anon")
    const prevAnon: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-21": { date: "2026-06-21", intention: "stale anon progress" },
      },
    }
    replaceState(prevAnon)
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]?.intention).toBe(
      "stale anon progress"
    )

    // SyncProvider calls resetAnonSlot() on every anon transition.
    resetAnonSlot()
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]).toBeUndefined()
    expect(getSnapshot()).toEqual(INITIAL_STATE)
  })

  it("setStorageScope to the same scope+user is a no-op (does not wipe state)", () => {
    setStorageScope("authed", USER_A)
    const next: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-21": { date: "2026-06-21", journal: "kept on no-op scope" },
      },
    }
    replaceState(next)

    // Same scope, same user: must preserve in-memory state.
    setStorageScope("authed", USER_A)
    expect(getSnapshot().entries["2026-06-21"]?.journal).toBe(
      "kept on no-op scope"
    )
  })

  it("per-user authed keys use a user-scoped slot name", () => {
    // Sanity check: the implementation actually keys by user id. If
    // someone flattens this back to a single shared key, the assertion
    // catches it.
    expect(authedStorageKey(USER_A)).toBe(`anchor-state-authed:${USER_A}`)
    expect(authedStorageKey(USER_B)).toBe(`anchor-state-authed:${USER_B}`)
  })

  it("legacy anchor-state key migrates into the active scope once and is removed", () => {
    // Simulate a browser that was last written by the pre-scope-split
    // store: a single `anchor-state` entry, no scoped slot yet.
    const legacy: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-05-01": { date: "2026-05-01", journal: "old journal" },
      },
    }
    memStorage.set(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ version: 1, data: legacy })
    )

    // First hydrate in an authed scope folds legacy into the authed slot
    // and removes the legacy key.
    setStorageScope("authed", USER_A)
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-05-01"]?.journal).toBe("old journal")
    expect(memStorage.has(LEGACY_STORAGE_KEY)).toBe(false)
    expect(memStorage.has(authedStorageKey(USER_A))).toBe(true)

    // A second hydrate in the same scope does NOT re-migrate (legacy
    // key is gone) and does NOT clobber the existing scoped data.
    replaceState({
      ...INITIAL_STATE,
      entries: {
        "2026-06-10": { date: "2026-06-10", journal: "current journal" },
      },
    })
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-10"]?.journal).toBe("current journal")
    expect(getSnapshot().entries["2026-05-01"]).toBeUndefined()
  })

  it("legacy anchor-state key migrates into the anon scope when the visitor is unauthenticated", () => {
    const legacy: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-04-15": { date: "2026-04-15", intention: "anon-pre-scope" },
      },
    }
    memStorage.set(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ version: 1, data: legacy })
    )

    setStorageScope("anon")
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-04-15"]?.intention).toBe("anon-pre-scope")
    expect(memStorage.has(LEGACY_STORAGE_KEY)).toBe(false)
  })

  it("legacy key is dropped but never overwrites an already-populated scoped slot", () => {
    // First the user has scoped data; then (perhaps because of a long
    // deploy window) a legacy entry shows up in storage. The active
    // scoped slot must remain the source of truth; legacy data must not
    // be migrated into it.
    setStorageScope("authed", USER_A)
    const current: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-20": { date: "2026-06-20", journal: "current journal" },
      },
    }
    replaceState(current)
    hydrateFromStorage()
    expect(memStorage.has(authedStorageKey(USER_A))).toBe(true)

    // A stale legacy entry appears (e.g. shared device, manual edit).
    const stale: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2025-01-01": { date: "2025-01-01", journal: "very old journal" },
      },
    }
    memStorage.set(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ version: 1, data: stale })
    )

    // Force re-hydrate by switching to anon then back to authed.
    setStorageScope("anon")
    setStorageScope("authed", USER_A)
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-20"]?.journal).toBe("current journal")
    expect(getSnapshot().entries["2025-01-01"]).toBeUndefined()
    expect(memStorage.has(LEGACY_STORAGE_KEY)).toBe(false)
  })
})
