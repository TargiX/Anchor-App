"use client"

import { useRef, useState } from "react"
import { ArrowRight } from "lucide-react"
import { DictationControl } from "@/components/dictation-control"
import { Button } from "@/components/ui/button"
import { saveQuickCheckIn } from "@/lib/store/actions"
import { flushDeviceStorage } from "@/lib/store/store"
import { LIMITS } from "@/lib/domain/validation"
import { getTodayKey } from "@/lib/time/today"

export function JournalComposer({
  ready,
  signedIn,
  reviewPeriod,
}: {
  ready: boolean
  signedIn: boolean
  reviewPeriod?: string
}) {
  const [note, setNote] = useState("")
  const [nextStep, setNextStep] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [voiceBusy, setVoiceBusy] = useState(false)
  const noteLimit =
    LIMITS.journalMax - (reviewPeriod ? reviewPeriod.length + 18 : 0)
  const [saving, setSaving] = useState(false)
  const pendingId = useRef<string | null>(null)
  const savingRef = useRef(false)

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")
    if (!ready || voiceBusy || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    pendingId.current ??= crypto.randomUUID()
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
    savingRef.current = false
    setSaving(false)
    if (!result.ok || !durable) {
      setError(
        !result.ok
          ? result.error
          : "Could not finish saving. Keep this screen open and try again."
      )
      return
    }
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
              pendingId.current = null
              setNote(event.target.value)
              setMessage("")
            }}
            disabled={saving || voiceBusy}
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
            disabled={!ready || saving}
            onBusy={setVoiceBusy}
            onInsert={(value) => {
              pendingId.current = null
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
            disabled={saving || voiceBusy}
            value={nextStep}
            onChange={(event) => {
              pendingId.current = null
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
            ? "Saved on this device first. Account sync status appears above."
            : "Saved on this device when you tap Save. Export a copy from Journal to keep a backup."}
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
