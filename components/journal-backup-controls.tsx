"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import { Capacitor, registerPlugin } from "@capacitor/core"
import { Button } from "@/components/ui/button"
import { JournalRecoveryError } from "@/lib/store/native-storage"
import { flushDeviceStorage } from "@/lib/store/store"
import {
  legacyArchive,
  MAX_BACKUP_BYTES,
  previewBackup,
  restoreBackup,
  type JournalBackupPort,
} from "@/lib/store/journal-backup"

const subscribe = () => () => {}
const legacy = {
  keys: () => Object.keys(window.localStorage),
  read: (key: string) => window.localStorage.getItem(key),
  write: () => false,
  remove: () => {},
}

export function JournalBackupControls({
  onRestored,
  onBusyChange,
}: {
  onRestored?: () => void
  onBusyChange?: (busy: boolean) => void
}) {
  const native = useSyncExternalStore(
    subscribe,
    () => Capacitor.getPlatform() === "ios",
    () => false
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [messageFailed, setMessageFailed] = useState(false)
  const [preview, setPreview] = useState<ReturnType<
    typeof previewBackup
  > | null>(null)
  const operation = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  if (!native) return null

  async function run(action: () => Promise<void>) {
    if (operation.current) return
    operation.current = true
    setBusy(true)
    onBusyChange?.(true)
    setMessage("")
    setMessageFailed(false)
    try {
      await action()
    } catch (error) {
      setMessageFailed(true)
      setMessage(
        error instanceof JournalRecoveryError
          ? error.reason === "newer-version"
            ? "This backup needs a newer version of Anchor. Update the app first."
            : "This file is not a readable Anchor backup. Your current data has not been replaced."
          : error instanceof Error
            ? error.message
            : "The operation could not be completed. Try again."
      )
    } finally {
      operation.current = false
      setBusy(false)
      onBusyChange?.(false)
    }
  }

  async function exportCopy(previous = false) {
    await run(async () => {
      if (!onRestored && !(await flushDeviceStorage())) {
        throw new Error(
          "Recent changes have not been saved. Retry saving before making a backup."
        )
      }
      const result = await registerPlugin<JournalBackupPort>(
        "AnchorJournal"
      ).exportArchive({
        legacyValue: legacyArchive(legacy),
        previous,
      })
      setMessageFailed(false)
      setMessage(result.cancelled ? "Export cancelled." : "Copy exported.")
    })
  }

  return (
    <section
      className="mt-10 border-t border-border pt-5"
      aria-label="Journal backups"
    >
      <h2 className="text-sm font-medium">Journal backups</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Every journal on this device. Files are not encrypted.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void exportCopy()}
        >
          Save a copy to Files
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => void exportCopy(true)}
        >
          Export copy from before last restore
        </Button>
        {!onRestored && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!(await flushDeviceStorage()))
                  throw new Error(
                    "Retry saving recent changes before restoring a backup."
                  )
                window.dispatchEvent(new Event("anchor:open-recovery"))
              })
            }
          >
            Restore a backup
          </Button>
        )}
        {onRestored && (
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              Choose backup to restore
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              aria-label="Choose Anchor backup"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (!file) return
                setPreview(null)
                void run(async () => {
                  if (file.size > MAX_BACKUP_BYTES)
                    throw new Error(
                      "This backup is larger than the supported 20 MB limit."
                    )
                  setPreview(previewBackup(await file.text()))
                })
              }}
            />
          </>
        )}
      </div>
      {preview && onRestored && (
        <div className="space-y-3 rounded-xl bg-muted p-4">
          <p>
            {preview.journals} journals · {preview.days} recorded days
          </p>
          <p className="text-sm">
            Restore this backup in place of all journals on this device? Entries
            created after the backup will not appear in the restored journal.
            Anchor keeps a separate copy of the current data first. Account
            journals remain linked to their original accounts.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await restoreBackup(
                    registerPlugin<JournalBackupPort>("AnchorJournal"),
                    preview.value,
                    legacy
                  )
                  setPreview(null)
                  onRestored()
                })
              }
            >
              Restore this backup
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {busy && (
        <p role="status" className="text-sm">
          Working…
        </p>
      )}
      {message && (
        <p role={messageFailed ? "alert" : "status"} className="text-sm">
          {message}
        </p>
      )}
    </section>
  )
}
