import type { StoragePort } from "./persistence"
import {
  ANON_STORAGE_KEY,
  AUTHED_STORAGE_KEY_PREFIX,
  LEGACY_STORAGE_KEY,
} from "./state"

export interface NativeJournalPort {
  load(): Promise<{ value: string | null }>
  save(options: { value: string }): Promise<void>
}

export function isJournalKey(key: string): boolean {
  return (
    key === ANON_STORAGE_KEY ||
    key === LEGACY_STORAGE_KEY ||
    key.startsWith(AUTHED_STORAGE_KEY_PREFIX)
  )
}

/** React reads a synchronous mirror; all native snapshots are written in order. */
export async function createNativeStorage(
  disk: NativeJournalPort,
  legacy: StoragePort,
  onStatus: (status: "saving" | "saved" | "error") => void
) {
  const loaded = await disk.load()
  let values: Record<string, string> = Object.create(null)
  if (loaded.value !== null) {
    const parsed: unknown = JSON.parse(loaded.value)
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      !Object.entries(parsed).every(
        ([key, value]) => isJournalKey(key) && typeof value === "string"
      )
    ) {
      throw new Error("Invalid native journal archive")
    }
    values = Object.assign(Object.create(null), parsed)
  } else {
    for (const key of legacy.keys().filter(isJournalKey)) {
      const value = legacy.read(key)
      if (value !== null) values[key] = value
    }
    // Never remove the only copy until native storage acknowledges migration.
    await disk.save({ value: JSON.stringify(values) })
  }
  for (const key of legacy.keys().filter(isJournalKey)) legacy.remove(key)

  let tail: Promise<boolean> = Promise.resolve(true)
  let revision = 0
  function enqueue(): Promise<boolean> {
    const snapshot = JSON.stringify(values)
    const current = ++revision
    onStatus("saving")
    tail = tail.then(async () => {
      try {
        await disk.save({ value: snapshot })
        if (current === revision) onStatus("saved")
        return true
      } catch {
        if (current === revision) onStatus("error")
        return false
      }
    })
    return tail
  }
  const storage: StoragePort = {
    read: (key) => values[key] ?? null,
    keys: () => Object.keys(values),
    write(key, value) {
      if (!isJournalKey(key)) return false
      values[key] = value
      void enqueue()
      return true
    },
    remove(key) {
      if (!(key in values)) return
      delete values[key]
      void enqueue()
    },
  }
  return { storage, flush: () => tail, retry: enqueue }
}
