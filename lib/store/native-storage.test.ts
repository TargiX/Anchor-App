import { describe, expect, it, vi } from "vitest"
import {
  createNativeStorage,
  JournalRecoveryError,
  type NativeJournalPort,
} from "./native-storage"
import type { StoragePort } from "./persistence"
import {
  ANON_STORAGE_KEY,
  authedStorageKey,
  INITIAL_STATE,
  LEGACY_STORAGE_KEY,
  STATE_VERSION,
} from "./state"

function journal(note: string, version = STATE_VERSION) {
  return JSON.stringify({
    version,
    data: {
      ...INITIAL_STATE,
      entries: { "2026-09-15": { date: "2026-09-15", journal: note } },
    },
  })
}

function fixture(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  const legacy: StoragePort = {
    keys: () => [...values.keys()],
    read: (key) => values.get(key) ?? null,
    write: (key, value) => {
      values.set(key, value)
      return true
    },
    remove: (key) => {
      values.delete(key)
    },
  }
  let archive: string | null = null
  const disk: NativeJournalPort = {
    load: vi.fn(async () => ({ value: archive })),
    save: vi.fn(async ({ value }) => {
      archive = value
    }),
  }
  return { legacy, values, disk, archive: () => JSON.parse(archive ?? "{}") }
}

describe("native journal storage", () => {
  it("preserves malformed device drafts instead of dropping them during startup", async () => {
    const slot = JSON.stringify({
      version: STATE_VERSION,
      data: INITIAL_STATE,
      localDrafts: { today: { note: "Keep my unfinished words" } },
    })
    const f = fixture()
    vi.mocked(f.disk.load).mockResolvedValue({
      value: JSON.stringify({ [ANON_STORAGE_KEY]: slot }),
    })
    await expect(
      createNativeStorage(f.disk, f.legacy, vi.fn())
    ).rejects.toBeInstanceOf(JournalRecoveryError)
    expect(f.disk.save).not.toHaveBeenCalled()
  })

  it.each([
    "{broken journal bytes",
    "null",
    "{}",
    JSON.stringify({
      version: 2,
      data: {
        ...INITIAL_STATE,
        entries: {
          good: { date: "2026-09-15", journal: "Keep me" },
          broken: { date: "invalid", journal: "Keep these bytes too" },
        },
      },
    }),
    journal("future fields must survive", STATE_VERSION + 1),
    JSON.stringify({ version: "2", data: INITIAL_STATE }),
  ])(
    "preserves invalid inner slots before any native mutation: %s",
    async (raw) => {
      for (const key of [
        ANON_STORAGE_KEY,
        authedStorageKey("a"),
        LEGACY_STORAGE_KEY,
      ]) {
        const f = fixture({ [ANON_STORAGE_KEY]: journal("backup") })
        const original = JSON.stringify({
          [ANON_STORAGE_KEY]: journal("good"),
          [key]: raw,
        })
        vi.mocked(f.disk.load).mockResolvedValue({ value: original })
        await expect(
          createNativeStorage(f.disk, f.legacy, vi.fn())
        ).rejects.toBeInstanceOf(JournalRecoveryError)
        expect(f.disk.save).not.toHaveBeenCalled()
        expect(f.legacy.read(ANON_STORAGE_KEY)).toBe(journal("backup"))
      }
    }
  )

  it("retains all WebView slots if migration contains damaged data", async () => {
    const f = fixture({
      [ANON_STORAGE_KEY]: journal("good"),
      [authedStorageKey("a")]: "broken",
    })
    await expect(
      createNativeStorage(f.disk, f.legacy, vi.fn())
    ).rejects.toThrow()
    expect(f.disk.save).not.toHaveBeenCalled()
    expect(f.values.size).toBe(2)
    expect(f.legacy.read(authedStorageKey("a"))).toBe("broken")
  })

  it("accepts supported envelopes and legacy flat state without rewriting their bytes", async () => {
    for (const raw of [
      journal("v1", 1),
      journal("v2"),
      JSON.stringify({ ...INITIAL_STATE, theme: "dark" }),
    ]) {
      const f = fixture({ [LEGACY_STORAGE_KEY]: raw })
      const a = await createNativeStorage(f.disk, f.legacy, vi.fn())
      expect(a.storage.read(LEGACY_STORAGE_KEY)).toBe(raw)
      expect(f.archive()[LEGACY_STORAGE_KEY]).toBe(raw)
    }
  })

  it("refuses invalid writes without changing the mirror or queued archive", async () => {
    const original = journal("original")
    const f = fixture({ [ANON_STORAGE_KEY]: original })
    const a = await createNativeStorage(f.disk, f.legacy, vi.fn())
    expect(a.storage.write(ANON_STORAGE_KEY, "broken")).toBe(false)
    expect(
      a.storage.write(ANON_STORAGE_KEY, journal("future", STATE_VERSION + 1))
    ).toBe(false)
    expect(await a.flush()).toBe(true)
    expect(a.storage.read(ANON_STORAGE_KEY)).toBe(original)
    expect(f.archive()[ANON_STORAGE_KEY]).toBe(original)
    expect(f.disk.save).toHaveBeenCalledTimes(1)
  })

  it("can reopen a repaired archive on retry without touching the failed original", async () => {
    const f = fixture()
    vi.mocked(f.disk.load)
      .mockResolvedValueOnce({
        value: JSON.stringify({ [ANON_STORAGE_KEY]: "broken" }),
      })
      .mockResolvedValueOnce({
        value: JSON.stringify({ [ANON_STORAGE_KEY]: journal("restored") }),
      })
    await expect(
      createNativeStorage(f.disk, f.legacy, vi.fn())
    ).rejects.toThrow()
    const a = await createNativeStorage(f.disk, f.legacy, vi.fn())
    expect(a.storage.read(ANON_STORAGE_KEY)).toBe(journal("restored"))
    expect(f.disk.save).not.toHaveBeenCalled()
  })

  it("migrates journal slots only and removes web copies after acknowledgement", async () => {
    const f = fixture({
      [ANON_STORAGE_KEY]: journal("guest"),
      [authedStorageKey("a")]: journal("private"),
      theme: "dark",
    })
    const adapter = await createNativeStorage(f.disk, f.legacy, vi.fn())
    expect(adapter.storage.read(ANON_STORAGE_KEY)).toBe(journal("guest"))
    expect(f.archive()).toEqual({
      [ANON_STORAGE_KEY]: journal("guest"),
      [authedStorageKey("a")]: journal("private"),
    })
    expect([...f.values.entries()]).toEqual([["theme", "dark"]])
  })
  it("retains the old copy when migration cannot write", async () => {
    const f = fixture({ [ANON_STORAGE_KEY]: journal("only copy") })
    vi.mocked(f.disk.save).mockRejectedValue(new Error("disk full"))
    await expect(
      createNativeStorage(f.disk, f.legacy, vi.fn())
    ).rejects.toThrow()
    expect(f.values.get(ANON_STORAGE_KEY)).toBe(journal("only copy"))
  })
  it("restores native data without reimporting stale web data", async () => {
    const f = fixture({ [ANON_STORAGE_KEY]: journal("stale") })
    vi.mocked(f.disk.load).mockResolvedValue({
      value: JSON.stringify({ [ANON_STORAGE_KEY]: journal("native") }),
    })
    const a = await createNativeStorage(f.disk, f.legacy, vi.fn())
    expect(a.storage.read(ANON_STORAGE_KEY)).toBe(journal("native"))
    expect(f.disk.save).not.toHaveBeenCalled()
  })
  it("blocks corrupt archives without replacing them or deleting legacy copies", async () => {
    for (const value of [
      "broken",
      "[]",
      '{"unexpected":"value"}',
      '{"anchor-state-anon":42}',
    ]) {
      const f = fixture({ [ANON_STORAGE_KEY]: journal("backup") })
      vi.mocked(f.disk.load).mockResolvedValue({ value })
      await expect(
        createNativeStorage(f.disk, f.legacy, vi.fn())
      ).rejects.toThrow()
      expect(f.disk.save).not.toHaveBeenCalled()
      expect(f.values.get(ANON_STORAGE_KEY)).toBe(journal("backup"))
    }
  })
  it("serializes snapshots and acknowledges only after the native write", async () => {
    const f = fixture()
    const status = vi.fn()
    const a = await createNativeStorage(f.disk, f.legacy, status)
    let release!: () => void
    vi.mocked(f.disk.save).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        })
    )
    a.storage.write(ANON_STORAGE_KEY, journal("first"))
    await Promise.resolve()
    a.storage.write(ANON_STORAGE_KEY, journal("second"))
    expect(f.disk.save).toHaveBeenCalledTimes(2) // migration + first
    expect(status).not.toHaveBeenCalledWith("saved")
    release()
    expect(await a.flush()).toBe(true)
    expect(f.archive()[ANON_STORAGE_KEY]).toBe(journal("second"))
    expect(status).toHaveBeenLastCalledWith("saved")
  })
  it("reports write failure and retries the latest state including account deletion", async () => {
    const key = authedStorageKey("a")
    const f = fixture({ [key]: journal("private") })
    const status = vi.fn()
    const a = await createNativeStorage(f.disk, f.legacy, status)
    vi.mocked(f.disk.save).mockRejectedValueOnce(new Error("locked"))
    a.storage.remove(key)
    expect(await a.flush()).toBe(false)
    expect(status).toHaveBeenLastCalledWith("error")
    expect(await a.retry()).toBe(true)
    expect(f.archive()).toEqual({})
  })
})
