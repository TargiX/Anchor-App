import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  getSnapshot,
  hydrateFromStorage,
  replaceState,
  resetState,
  setStorageScope,
} from "./store"
import { INITIAL_STATE, type AppState } from "./state"

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

beforeEach(() => {
  // @ts-expect-error polyfill localStorage for store.ts
  globalThis.window = { localStorage: localStorageShim }
  memStorage.clear()
  // Start each test from a known authed scope.
  setStorageScope("authed")
  resetState()
})

afterEach(() => {
  // @ts-expect-error cleanup
  delete globalThis.window
  memStorage.clear()
  setStorageScope("authed")
  resetState()
})

describe("storage scope isolation", () => {
  it("persists authed and anon state to separate slots", () => {
    setStorageScope("authed")
    const authed: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-21": { date: "2026-06-21", journal: "private journal" },
      },
    }
    replaceState(authed)
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]?.journal).toBe("private journal")

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

    // Switching back to authed reveals the authed data only.
    setStorageScope("authed")
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]?.journal).toBe("private journal")
    expect(getSnapshot().entries["2026-06-22"]).toBeUndefined()
  })

  it("authed → anon sign-out clears the authed slot before re-hydrating anon", () => {
    setStorageScope("authed")
    replaceState({
      ...INITIAL_STATE,
      entries: {
        "2026-06-21": { date: "2026-06-21", journal: "private journal" },
      },
    })
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]?.journal).toBe("private journal")

    // Sign-out path: SyncProvider sees status=anon and calls setStorageScope.
    setStorageScope("anon")
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]).toBeUndefined()
  })

  it("setStorageScope to the same scope is a no-op (does not wipe state)", () => {
    setStorageScope("authed")
    const next: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-21": { date: "2026-06-21", journal: "kept on no-op scope switch" },
      },
    }
    replaceState(next)

    // Same-scope transition must preserve in-memory state.
    setStorageScope("authed")
    expect(getSnapshot().entries["2026-06-21"]?.journal).toBe(
      "kept on no-op scope switch",
    )
  })
})