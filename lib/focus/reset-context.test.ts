import { describe, expect, it } from "vitest"
import {
  FOCUS_RESET_CONTEXT_KEY,
  FOCUS_RESET_CONTEXT_TTL_MS,
  saveFocusResetContext,
  saveFocusResetContextFrom,
  takeFocusResetContext,
  takeFocusResetContextFrom,
} from "./reset-context"

function createStorage() {
  const values = new Map<string, string>()

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    has: (key: string) => values.has(key),
  }
}

describe("focus reset context", () => {
  it("keeps the extracted next step private to one Focus arrival", () => {
    const storage = createStorage()
    const now = 1_700_000_000_000

    saveFocusResetContext(storage, "  close one review comment  ", now)

    expect(takeFocusResetContext(storage, now + 1)).toEqual({
      nextStep: "close one review comment",
      createdAt: now,
    })
    expect(storage.has(FOCUS_RESET_CONTEXT_KEY)).toBe(false)
    expect(takeFocusResetContext(storage, now + 2)).toBeNull()
  })

  it("drops malformed or stale context instead of surfacing old private text", () => {
    const storage = createStorage()
    const now = 1_700_000_000_000

    storage.setItem(FOCUS_RESET_CONTEXT_KEY, "not-json")
    expect(takeFocusResetContext(storage, now)).toBeNull()

    saveFocusResetContext(storage, "a stale task", now)
    expect(takeFocusResetContext(storage, now + FOCUS_RESET_CONTEXT_TTL_MS + 1)).toBeNull()
  })

  it("falls back to generic Focus completion when session storage is unavailable", () => {
    const unavailableStorage = {
      getItem: () => {
        throw new Error("Storage access denied")
      },
      setItem: () => undefined,
      removeItem: () => {
        throw new Error("Storage access denied")
      },
    }

    expect(takeFocusResetContext(unavailableStorage)).toBeNull()
  })

  it("handles a denied session storage getter without crashing Focus", () => {
    const deniedStorageGetter = () => {
      throw new Error("Storage access denied")
    }

    expect(takeFocusResetContextFrom(deniedStorageGetter)).toBeNull()
  })

  it("navigates without a reset context when session storage writes are denied", () => {
    const deniedWriteStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("Storage write denied")
      },
      removeItem: () => undefined,
    }

    expect(saveFocusResetContextFrom(() => deniedWriteStorage, "start the task")).toBe(false)
  })
})
