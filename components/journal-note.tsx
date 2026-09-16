"use client"

import {
  createContext,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { Button } from "@/components/ui/button"
import {
  deleteJournalText,
  editJournalText,
  undoJournalDeletion,
  type JournalTarget,
  type JournalText,
} from "@/lib/store/journal-editing"
import {
  flushDeviceStorage,
  retryDeviceStorage,
  getStorageIdentity,
  subscribe,
} from "@/lib/store/store"
import { createDeletionOperation } from "@/lib/store/journal-deletion"
import { LIMITS } from "@/lib/domain/validation"

type DeletionOperation = ReturnType<typeof createDeletionOperation>
const DeletionContext = createContext<
  (target: JournalTarget, expected: JournalText) => boolean
>(() => false)
export function JournalEditingProvider({ children }: { children: ReactNode }) {
  const [operation, setOperation] = useState<DeletionOperation | null>(null)
  const latest = useRef<DeletionOperation | null>(null)
  function remove(target: JournalTarget, expected: JournalText) {
    const previous = latest.current?.getStatus()
    if (previous && !["deleted", "restored", "conflict"].includes(previous))
      return false
    const token = deleteJournalText(target, expected)
    if (!token) return false
    const next = createDeletionOperation(token, {
      flush: flushDeviceStorage,
      retry: retryDeviceStorage,
      undo: undoJournalDeletion,
      identity: getStorageIdentity,
    })
    latest.current = next
    setOperation(next)
    void next.save()
    return true
  }
  return (
    <DeletionContext.Provider value={remove}>
      {children}
      {operation && (
        <DeletionNotice
          operation={operation}
          dismiss={() => {
            latest.current = null
            setOperation(null)
          }}
        />
      )}
    </DeletionContext.Provider>
  )
}

function DeletionNotice({
  operation,
  dismiss,
}: {
  operation: DeletionOperation
  dismiss: () => void
}) {
  const status = useSyncExternalStore(
    operation.subscribe,
    operation.getStatus,
    operation.getStatus
  )
  const messages = {
    saving: "Saving deletion…",
    deleted: "Note deleted.",
    error:
      "Deletion has not been saved. Keep Anchor open and retry, or undo the deletion.",
    restoring: "Restoring note…",
    "restore-error":
      "The restored note has not been saved. Keep Anchor open and retry.",
    restored: "Note restored.",
    conflict:
      "The journal changed. This operation can no longer be applied here.",
  }
  return (
    <aside
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl border bg-background p-4 shadow-lg"
    >
      <p>{messages[status]}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {status === "error" && (
          <Button onClick={() => void operation.save(true)}>
            Retry deletion
          </Button>
        )}
        {status === "restore-error" && (
          <Button onClick={() => void operation.undo()}>Retry restoring</Button>
        )}
        {(["deleted", "error"] as string[]).includes(status) && (
          <Button onClick={() => void operation.undo()}>Undo delete</Button>
        )}
        {(["deleted", "restored", "conflict"] as string[]).includes(status) && (
          <Button variant="ghost" onClick={dismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </aside>
  )
}

export function JournalNote(props: {
  target: JournalTarget
  text: JournalText
}) {
  const identity = useSyncExternalStore(
    subscribe,
    getStorageIdentity,
    () => null
  )
  return (
    <NoteEditor
      key={`${identity}:${props.target.day}:${props.target.id ?? "journal"}`}
      {...props}
    />
  )
}

function NoteEditor({
  target,
  text,
}: {
  target: JournalTarget
  text: JournalText
}) {
  const removeNote = useContext(DeletionContext)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draft, setDraft] = useState(text)
  const [baseline, setBaseline] = useState(text)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const pending = useRef(false)
  async function save() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError("")
    const identity = getStorageIdentity()
    const saved = editJournalText(target, baseline, draft)
    const durable = saved && (await flushDeviceStorage())
    pending.current = false
    setBusy(false)
    if (identity !== getStorageIdentity()) return
    if (saved) {
      setBaseline({ note: draft.note.trim(), nextStep: draft.nextStep.trim() })
      if (durable) setEditing(false)
    }
    if (!saved || !durable)
      setError(
        saved
          ? "Changes are not saved yet. Keep this screen open and retry."
          : "The note changed or could not be saved. Copy your edits, then reopen it."
      )
  }
  function remove() {
    if (pending.current) return
    if (!removeNote(target, baseline)) {
      setError(
        "The note changed or another deletion still needs saving. Finish that operation, then try again."
      )
    }
  }
  return (
    <div className="space-y-3">
      {editing ? (
        <>
          <label className="block text-sm">
            Edit note
            <textarea
              aria-label="Edit note"
              value={draft.note}
              disabled={busy}
              maxLength={LIMITS.journalMax}
              rows={5}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              className="mt-2 w-full rounded-xl border bg-background p-3 text-base"
            />
          </label>
          {target.id && (
            <label className="block text-sm">
              Next step
              <input
                aria-label="Edit next step"
                value={draft.nextStep}
                disabled={busy}
                maxLength={LIMITS.intentionMax}
                onChange={(e) =>
                  setDraft({ ...draft, nextStep: e.target.value })
                }
                className="mt-2 min-h-12 w-full rounded-xl border bg-background p-3"
              />
            </label>
          )}
          <div className="flex gap-3">
            <Button
              disabled={busy || !draft.note.trim()}
              onClick={() => void save()}
            >
              Save changes
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel editing
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
            {text.note}
          </p>
          {text.nextStep && (
            <p className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
              Next step: {text.nextStep}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(text)
                setBaseline(text)
                setEditing(true)
                setConfirmDelete(false)
                setError("")
              }}
            >
              Edit note
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setBaseline(text)
                setConfirmDelete(true)
              }}
            >
              Delete note
            </Button>
          </div>
        </>
      )}
      {confirmDelete && (
        <div className="rounded-xl border p-3">
          <p className="mb-2 text-sm">
            Delete this note? The rest of your day stays saved.
          </p>
          <Button variant="destructive" onClick={remove}>
            Confirm delete
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Keep note
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
