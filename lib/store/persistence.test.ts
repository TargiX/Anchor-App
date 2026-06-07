import { describe, it, expect, afterEach } from "vitest"
import { localStorageAdapter } from "./persistence"

describe("localStorageAdapter", () => {
  afterEach(() => {
    // @ts-expect-error clean up
    delete globalThis.window
  })

  it("returns null and no-ops when window is undefined (SSR)", () => {
    expect(localStorageAdapter.read("k")).toBeNull()
    expect(() => localStorageAdapter.write("k", "v")).not.toThrow()
    expect(() => localStorageAdapter.remove("k")).not.toThrow()
  })

  it("reads/writes/removes values when localStorage is available", () => {
    const store = new Map<string, string>()
    // @ts-expect-error polyfill
    globalThis.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v) },
        removeItem: (k: string) => { store.delete(k) },
        get length() { return store.size },
        key: () => null,
        clear() { store.clear() },
      },
    }

    expect(localStorageAdapter.read("a")).toBeNull()
    localStorageAdapter.write("a", "1")
    expect(localStorageAdapter.read("a")).toBe("1")
    localStorageAdapter.remove("a")
    expect(localStorageAdapter.read("a")).toBeNull()
  })

  it("returns null when getItem throws", () => {
    // @ts-expect-error polyfill
    globalThis.window = {
      localStorage: {
        getItem: () => { throw new Error("blocked") },
        setItem: () => {},
        removeItem: () => {},
        get length() { return 0 },
        key: () => null,
        clear() {},
      },
    }

    expect(localStorageAdapter.read("x")).toBeNull()
  })

  it("silently ignores write failures", () => {
    // @ts-expect-error polyfill
    globalThis.window = {
      localStorage: {
        getItem: () => null,
        setItem: () => { throw new DOMException("QuotaExceededError") },
        removeItem: () => {},
        get length() { return 0 },
        key: () => null,
        clear() {},
      },
    }

    expect(() => localStorageAdapter.write("x", "v")).not.toThrow()
  })
})
