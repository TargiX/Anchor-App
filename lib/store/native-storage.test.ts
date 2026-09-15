import { describe, expect, it, vi } from "vitest"
import { createNativeStorage, type NativeJournalPort } from "./native-storage"
import type { StoragePort } from "./persistence"
import { ANON_STORAGE_KEY, authedStorageKey } from "./state"

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
  it("migrates journal slots only and removes web copies after acknowledgement", async () => {
    const f = fixture({
      [ANON_STORAGE_KEY]: "guest",
      [authedStorageKey("a")]: "private",
      theme: "dark",
    })
    const adapter = await createNativeStorage(f.disk, f.legacy, vi.fn())
    expect(adapter.storage.read(ANON_STORAGE_KEY)).toBe("guest")
    expect(f.archive()).toEqual({
      [ANON_STORAGE_KEY]: "guest",
      [authedStorageKey("a")]: "private",
    })
    expect([...f.values.entries()]).toEqual([["theme", "dark"]])
  })
  it("retains the old copy when migration cannot write", async () => {
    const f = fixture({ [ANON_STORAGE_KEY]: "only copy" })
    vi.mocked(f.disk.save).mockRejectedValue(new Error("disk full"))
    await expect(
      createNativeStorage(f.disk, f.legacy, vi.fn())
    ).rejects.toThrow()
    expect(f.values.get(ANON_STORAGE_KEY)).toBe("only copy")
  })
  it("restores native data without reimporting stale web data", async () => {
    const f = fixture({ [ANON_STORAGE_KEY]: "stale" })
    vi.mocked(f.disk.load).mockResolvedValue({
      value: JSON.stringify({ [ANON_STORAGE_KEY]: "native" }),
    })
    const a = await createNativeStorage(f.disk, f.legacy, vi.fn())
    expect(a.storage.read(ANON_STORAGE_KEY)).toBe("native")
    expect(f.disk.save).not.toHaveBeenCalled()
  })
  it("blocks corrupt archives without replacing them or deleting legacy copies", async () => {
    for (const value of [
      "broken",
      "[]",
      '{"unexpected":"value"}',
      '{"anchor-state-anon":42}',
    ]) {
      const f = fixture({ [ANON_STORAGE_KEY]: "backup" })
      vi.mocked(f.disk.load).mockResolvedValue({ value })
      await expect(
        createNativeStorage(f.disk, f.legacy, vi.fn())
      ).rejects.toThrow()
      expect(f.disk.save).not.toHaveBeenCalled()
      expect(f.values.get(ANON_STORAGE_KEY)).toBe("backup")
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
    a.storage.write(ANON_STORAGE_KEY, "first")
    await Promise.resolve()
    a.storage.write(ANON_STORAGE_KEY, "second")
    expect(f.disk.save).toHaveBeenCalledTimes(2) // migration + first
    expect(status).not.toHaveBeenCalledWith("saved")
    release()
    expect(await a.flush()).toBe(true)
    expect(f.archive()[ANON_STORAGE_KEY]).toBe("second")
    expect(status).toHaveBeenLastCalledWith("saved")
  })
  it("reports write failure and retries the latest state including account deletion", async () => {
    const key = authedStorageKey("a")
    const f = fixture({ [key]: "private" })
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
