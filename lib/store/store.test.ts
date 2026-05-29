import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { STATE_VERSION, STORAGE_KEY } from "./state"

function makeLocalStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed))

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    dump: () => Object.fromEntries(values),
  }
}

function envelope(data: unknown): string {
  return JSON.stringify({ version: STATE_VERSION, data })
}

describe("store storage scopes", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("hydrates separate local caches for separate auth scopes", async () => {
    vi.stubGlobal("window", {
      localStorage: makeLocalStorage({
        [`${STORAGE_KEY}:user:a`]: envelope({
          entries: { "2026-05-20": { date: "2026-05-20", intention: "A" } },
          habits: [],
          notificationMorning: "08:00",
          notificationEvening: "20:00",
        }),
        [`${STORAGE_KEY}:user:b`]: envelope({
          entries: { "2026-05-21": { date: "2026-05-21", intention: "B" } },
          habits: [],
          notificationMorning: "08:00",
          notificationEvening: "20:00",
        }),
      }),
    })

    const store = await import("./store")

    store.setStorageScope("user:a")
    expect(Object.keys(store.getSnapshot().entries)).toEqual(["2026-05-20"])

    store.setStorageScope("user:b")
    expect(Object.keys(store.getSnapshot().entries)).toEqual(["2026-05-21"])

    store.setStorageScope("anon")
    expect(store.getSnapshot().entries).toEqual({})
  })

  it("uses the legacy local-only bucket when scope is null", async () => {
    vi.stubGlobal("window", {
      localStorage: makeLocalStorage({
        [STORAGE_KEY]: envelope({
          entries: { "2026-05-22": { date: "2026-05-22", intention: "Local" } },
          habits: [],
          notificationMorning: "08:00",
          notificationEvening: "20:00",
        }),
      }),
    })

    const store = await import("./store")

    store.setStorageScope("anon")
    expect(store.getSnapshot().entries).toEqual({})

    store.setStorageScope(null)
    expect(Object.keys(store.getSnapshot().entries)).toEqual(["2026-05-22"])
  })

  it("persists writes into the active auth scope only", async () => {
    const localStorage = makeLocalStorage()
    vi.stubGlobal("window", { localStorage })

    const store = await import("./store")

    store.setStorageScope("user:a")
    store.setState((prev) => ({
      ...prev,
      entries: {
        "2026-05-23": { date: "2026-05-23", intention: "Scoped" },
      },
    }))

    const dump = localStorage.dump()
    expect(dump[STORAGE_KEY]).toBeUndefined()
    expect(dump[`${STORAGE_KEY}:user:a`]).toContain("Scoped")
  })
})
