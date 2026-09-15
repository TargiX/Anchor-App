import { isJournalKey, parseJournalArchive } from "./native-storage"
import type { StoragePort } from "./persistence"

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

export interface JournalBackupPort {
  exportArchive(options: {
    legacyValue: string
    previous?: boolean
  }): Promise<{ cancelled: boolean }>
  restoreArchive(options: { value: string; legacyValue: string }): Promise<void>
}

export function legacyArchive(storage: StoragePort): string {
  const entries = storage
    .keys()
    .filter(isJournalKey)
    .map((key) => [key, storage.read(key)])
  return JSON.stringify(
    Object.fromEntries(entries.filter(([, value]) => value !== null))
  )
}

export function previewBackup(value: string) {
  if (new TextEncoder().encode(value).length > MAX_BACKUP_BYTES) {
    throw new Error("This backup is larger than the supported 20 MB limit.")
  }
  const slots = parseJournalArchive(value)
  if (Object.keys(slots).length === 0)
    throw new Error("This backup contains no journals.")
  let days = 0
  for (const raw of Object.values(slots)) {
    const parsed = JSON.parse(raw)
    days += Object.keys((parsed.data ?? parsed).entries).length
  }
  return { value, journals: Object.keys(slots).length, days }
}

/** Called only from the blocked startup screen, before auth/sync can mount. */
export async function restoreBackup(
  disk: JournalBackupPort,
  value: string,
  legacy: StoragePort
) {
  previewBackup(value)
  // The native operation must preserve the old bytes before replacing anything.
  await disk.restoreArchive({ value, legacyValue: legacyArchive(legacy) })
  // Startup owns WebView cleanup, after rereading the acknowledged native archive.
}
