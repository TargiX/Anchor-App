import { describe, expect, it, vi } from "vitest"
import { legacyArchive, previewBackup, restoreBackup } from "./journal-backup"
import {
  ANON_STORAGE_KEY,
  authedStorageKey,
  INITIAL_STATE,
  STATE_VERSION,
} from "./state"
import { JournalRecoveryError } from "./native-storage"

const journal = JSON.stringify({
  version: 2,
  data: {
    ...INITIAL_STATE,
    entries: { "2026-09-15": { date: "2026-09-15", journal: "Keep this" } },
  },
})
const valid = JSON.stringify({ [ANON_STORAGE_KEY]: journal })
const legacy = () => ({
  keys: () => [ANON_STORAGE_KEY, "theme", "auth-token"],
  read: (key: string) =>
    key === ANON_STORAGE_KEY
      ? "original damaged bytes"
      : "private unrelated data",
  write: vi.fn(() => true),
  remove: vi.fn(),
})

describe("journal backup recovery", () => {
  it("previews all original account slots without combining identities or changing bytes", () => {
    const value = JSON.stringify({
      [ANON_STORAGE_KEY]: journal,
      [authedStorageKey("a")]: journal,
    })
    expect(previewBackup(value)).toEqual({ value, journals: 2, days: 2 })
  })
  it.each([
    "broken",
    "{}",
    '{"unexpected":"data"}',
    JSON.stringify({ [ANON_STORAGE_KEY]: "broken" }),
    JSON.stringify({
      [ANON_STORAGE_KEY]: JSON.stringify({
        version: STATE_VERSION + 1,
        data: INITIAL_STATE,
        STATE_VERSION,
      }),
    }),
  ])(
    "rejects unreadable, empty and future backups before touching native storage",
    async (value) => {
      const disk = { restoreArchive: vi.fn(), exportArchive: vi.fn() }
      const storage = legacy()
      await expect(restoreBackup(disk, value, storage)).rejects.toThrow()
      expect(disk.restoreArchive).not.toHaveBeenCalled()
      expect(storage.remove).not.toHaveBeenCalled()
    }
  )
  it("distinguishes newer backups", () => {
    try {
      previewBackup(
        JSON.stringify({
          [ANON_STORAGE_KEY]: JSON.stringify({
            version: STATE_VERSION + 1,
            data: INITIAL_STATE,
          }),
        })
      )
      throw new Error("expected validation failure")
    } catch (error) {
      expect(error).toBeInstanceOf(JournalRecoveryError)
      expect((error as JournalRecoveryError).reason).toBe("newer-version")
    }
  })
  it("backs up only journal keys including malformed original strings", () => {
    expect(legacyArchive(legacy())).toBe(
      JSON.stringify({ [ANON_STORAGE_KEY]: "original damaged bytes" })
    )
  })
  it("awaits native preservation and replacement without removing the old WebView copy", async () => {
    let finish!: () => void
    const disk = {
      restoreArchive: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve
          })
      ),
      exportArchive: vi.fn(),
    }
    const storage = legacy()
    let done = false
    const result = restoreBackup(disk, valid, storage).then(() => {
      done = true
    })
    await Promise.resolve()
    expect(done).toBe(false)
    expect(disk.restoreArchive).toHaveBeenCalledWith({
      value: valid,
      legacyValue: legacyArchive(storage),
    })
    finish()
    await result
    expect(done).toBe(true)
    expect(storage.remove).not.toHaveBeenCalled()
  })
  it("keeps legacy copies on native failure or authentication cancellation", async () => {
    const storage = legacy()
    const disk = {
      restoreArchive: vi.fn().mockRejectedValue(new Error("cancelled")),
      exportArchive: vi.fn(),
    }
    await expect(restoreBackup(disk, valid, storage)).rejects.toThrow(
      "cancelled"
    )
    expect(storage.remove).not.toHaveBeenCalled()
    expect(storage.write).not.toHaveBeenCalled()
  })
  it("does not call native replacement when legacy storage is unreadable", async () => {
    const disk = { restoreArchive: vi.fn(), exportArchive: vi.fn() }
    await expect(
      restoreBackup(disk, valid, {
        ...legacy(),
        keys: () => {
          throw new Error("unreadable")
        },
      })
    ).rejects.toThrow()
    expect(disk.restoreArchive).not.toHaveBeenCalled()
  })
})

it("reinitializing device storage does not retain notes absent from a restored backup", async () => {
  vi.resetModules()
  const store = await import("./store")
  const storage = {
    keys: () => [ANON_STORAGE_KEY],
    read: () => journal,
    write: () => true,
    remove: () => {},
  }
  store.installDeviceStorage(storage, async () => true)
  store.setStorageScope("anon")
  store.hydrateFromStorage()
  expect(Object.keys(store.getSnapshot().entries)).toHaveLength(1)
  store.installDeviceStorage(
    { ...storage, keys: () => [], read: () => null },
    async () => true
  )
  store.hydrateFromStorage()
  expect(store.getSnapshot().entries).toEqual({})
})
