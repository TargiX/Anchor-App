"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import { ArrowRight } from "lucide-react"
import { DictationControl } from "@/components/dictation-control"
import { Button } from "@/components/ui/button"
import { saveQuickCheckIn } from "@/lib/store/actions"
import {
  flushDeviceStorage,
  getJournalDrafts,
  saveJournalDraft,
  getStorageIdentity,
  subscribe,
  getSnapshot,
} from "@/lib/store/store"
import { LIMITS } from "@/lib/domain/validation"
import { getTodayKey } from "@/lib/time/today"

export function JournalComposer(props: {
  ready: boolean
  signedIn: boolean
  reviewPeriod?: string
}) {
  const identity = useSyncExternalStore(
    subscribe,
    getStorageIdentity,
    () => null
  )
  if (!props.ready || !identity)
    return <p role="status">Opening your journal…</p>
  return (
    <Composer key={`${identity}:${props.reviewPeriod ?? "today"}`} {...props} />
  )
}

function Composer({
  ready,
  signedIn,
  reviewPeriod,
}: {
  ready: boolean
  signedIn: boolean
  reviewPeriod?: string
}) {
  const context = reviewPeriod ? `review:${reviewPeriod}` : "today"
  const [initial] = useState(() => {
    const draft = getJournalDrafts()[context]
    // A crash between durable note save and draft cleanup must not duplicate it.
    return draft &&
      !Object.values(getSnapshot().entries).some((entry) =>
        entry.quickCheckIns?.some((item) => item.id === draft.id)
      )
      ? draft
      : undefined
  })
  const [note, setNote] = useState(initial?.note ?? "")
  const [nextStep, setNextStep] = useState(initial?.nextStep ?? "")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [voiceBusy, setVoiceBusy] = useState(false)
  const noteLimit =
    LIMITS.journalMax - (reviewPeriod ? reviewPeriod.length + 18 : 0)
  const [saving, setSaving] = useState(false)
  const [retryOnly, setRetryOnly] = useState(false)
  const pendingId = useRef<string | null>(initial?.id ?? null)
  const savingRef = useRef(false)

  function remember(nextNote: string, step: string) {
    pendingId.current ??= crypto.randomUUID()
    const saved = saveJournalDraft(
      context,
      nextNote || step
        ? {
            id: pendingId.current,
            createdAt: new Date().toISOString(),
            day: getTodayKey(),
            note: nextNote,
            nextStep: step,
          }
        : null
    )
    if (!saved)
      setError(
        "Your draft could not be saved. Copy your text before leaving this screen."
      )
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")
    if (!ready || voiceBusy || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    pendingId.current ??= crypto.randomUUID()
    const identity = getStorageIdentity()
    const result = saveQuickCheckIn(
      {
        id: pendingId.current,
        createdAt: new Date().toISOString(),
        note: reviewPeriod ? `Week in review (${reviewPeriod})\n${note}` : note,
        nextStep,
      },
      getTodayKey()
    )
    const durable = result.ok && (await flushDeviceStorage())
    if (!result.ok || !durable) {
      savingRef.current = false
      setSaving(false)
      setRetryOnly(result.ok)
      setError(
        !result.ok
          ? result.error
          : "Could not finish saving. Keep this screen open and try again."
      )
      return
    }
    if (identity !== getStorageIdentity()) return
    saveJournalDraft(context, null)
    await flushDeviceStorage()
    savingRef.current = false
    setSaving(false)
    setRetryOnly(false)
    pendingId.current = null
    setNote("")
    setNextStep("")
    setMessage("Saved on this device. You can leave it here.")
  }

  return (
    <>
      <form
        id="journal-composer"
        onSubmit={save}
        className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-7"
      >
        <div>
          <label htmlFor="checkin-note" className="block font-medium">
            {reviewPeriod
              ? "What do you want to take into next week?"
              : "What would you like to remember?"}
          </label>
          <p id="note-hint" className="mt-1 text-sm text-muted-foreground">
            {reviewPeriod
              ? "What supported you? What would you like to change?"
              : "A good moment, a difficult feeling, an idea. There’s room for all of it."}
          </p>
          <textarea
            id="checkin-note"
            value={note}
            onChange={(event) => {
              remember(event.target.value, nextStep)
              setNote(event.target.value)
              setMessage("")
            }}
            disabled={saving || voiceBusy || retryOnly}
            required
            maxLength={noteLimit}
            rows={4}
            aria-describedby="note-hint"
            placeholder={
              reviewPeriod
                ? "Something I want to keep doing…"
                : "Today, I noticed…"
            }
            className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-3 text-base leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <DictationControl
            note={note}
            limit={noteLimit}
            disabled={!ready || saving || retryOnly}
            onBusy={setVoiceBusy}
            onInsert={(value) => {
              remember(value, nextStep)
              setNote(value)
              setMessage("")
            }}
          />
        </div>
        <div>
          <label htmlFor="checkin-next" className="block font-medium">
            One small next step{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <input
            id="checkin-next"
            disabled={saving || voiceBusy || retryOnly}
            value={nextStep}
            onChange={(event) => {
              remember(note, event.target.value)
              setNextStep(event.target.value)
            }}
            maxLength={LIMITS.intentionMax}
            placeholder="Open the document. Or take a break."
            className="mt-3 min-h-12 w-full rounded-xl border border-border bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Add a step to update today’s anchor, or leave it empty to keep the
            current one.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={saving || voiceBusy || !ready || !note.trim()}
          className="min-h-12 w-full rounded-xl text-base"
        >
          {saving ? "Saving…" : "Save check-in"}{" "}
          <ArrowRight className="size-4" />
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">
          {signedIn
            ? "Drafts stay on this device. Saved entries can sync with your account."
            : "Your draft stays on this device when you leave. Tap Save to add it to your journal."}
        </p>
      </form>
      <p
        role="status"
        aria-live="polite"
        className="mt-4 min-h-6 text-sm text-primary"
      >
        {message}
      </p>
    </>
  )
}
