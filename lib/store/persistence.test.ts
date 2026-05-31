import { describe, it, expect, afterEach } from "vitest"
import { localStorageAdapter } from "./persistence"

describe("localStorageAdapter", () => {
  afterEach(() => {
    // @ts-expect-error clean up
    delete globalThis.window
    // @ts-expect-error clean up
    delete globalThis.localStorage
  })

  it("returns null and no-ops when window is undefined (SSR)", () => {
    // Default node env: no window
    expect(localStorageAdapter.read("k")).toBeNull()
    expect(() => localStorageAdapter.write("k", "v")).not.toThrow()
    expect(() => localStorageAdapter.remove("k")).not.toThrow()
  })

  it("reads/writes/removes values when localStorage is available", () => {
    const store = new Map<string, string>()
    const fakeLS = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
      get length() { return store.size },
      key: () => null,
      clear() { store.clear() },
    }
    // @ts-expect-error polyfill
    globalThis.window = { localStorage: fakeLS }

    expect(localStorageAdapter.read("a")).toBeNull()
    localStorageAdapter.write("a", "1")
    expect(localStorageAdapter.read("a")).toBe("1")
    localStorageAdapter.remove("a")
    expect(localStorageAdapter.read("a")).toBeNull()
  })

  it("returns null when getItem throws", () => {
    const fakeLS = {
      getItem: () => { throw new Error("blocked") },
      setItem: () => {},
      removeItem: () => {},
      get length() { return 0 },
      key: () => null,
      clear() {},
    }
    // @ts-expect-error polyfill
    globalThis.window = { localStorage: fakeLS }

    expect(localStorageAdapter.read("x")).toBeNull()
  })

  it("silently ignores write failures", () => {
    const fakeLS = {
      getItem: () => null,
      setItem: () => { throw new DOMException("QuotaExceededError") },
      removeItem: () => {},
      get length() { return 0 },
      key: () => null,
      clear() {},
    }
    // @ts-expect-error polyfill
    globalThis.window = { localStorage: fakeLS }

    expect(() => localStorageAdapter.write("x", "v")).not.toThrow()
  })
})
