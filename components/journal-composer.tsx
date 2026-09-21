"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import {
  DictationControl,
  useIosDictation,
} from "@/components/dictation-control"
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
import { journalPhotoSrc } from "@/lib/domain/photo"
import type { JournalPhoto } from "@/lib/domain/photo"
import { encodeJournalPhoto } from "@/lib/journal/encode-photo"
import { LIMITS } from "@/lib/domain/validation"
import { getTodayKey } from "@/lib/time/today"

export function JournalComposer(props: {
  ready: boolean
  signedIn: boolean
  reviewPeriod?: string
  reviewWeekEnd?: string
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
  reviewWeekEnd,
}: {
  ready: boolean
  signedIn: boolean
  reviewPeriod?: string
  reviewWeekEnd?: string
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
  const [stepExpanded, setStepExpanded] = useState(Boolean(initial?.nextStep))
  const [photo, setPhoto] = useState<JournalPhoto | undefined>()
  const [photoBusy, setPhotoBusy] = useState(false)
  const iosDictation = useIosDictation()
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [voiceBusy, setVoiceBusy] = useState(false)
  const noteLimit =
    LIMITS.journalMax - (reviewPeriod ? reviewPeriod.length + 18 : 0)
  const [saving, setSaving] = useState(false)
  const [retryOnly, setRetryOnly] = useState(false)
  const pendingId = useRef<string | null>(initial?.id ?? null)
  const savingRef = useRef(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  // Grow with content; collapse back when emptied. Runs on every `note`
  // change so dictation inserts and post-save resets resize too.
  useEffect(() => {
    const el = noteRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [note])

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
    if (!ready || voiceBusy || photoBusy || savingRef.current) return
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
        photo,
      },
      getTodayKey(),
      reviewWeekEnd ? { weeklyReviewEnd: reviewWeekEnd } : undefined
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
    setPhoto(undefined)
    setStepExpanded(false)
    setMessage("Saved on this device. You can leave it here.")
  }

  return (
    <>
      <form id="journal-composer" onSubmit={save} className="space-y-3">
        <div>
          <label
            htmlFor="checkin-note"
            className="block text-xs font-medium text-muted-foreground"
          >
            {reviewPeriod ? "What should next week keep?" : "New note"}
          </label>
          <textarea
            id="checkin-note"
            ref={noteRef}
            value={note}
            onChange={(event) => {
              remember(event.target.value, nextStep)
              setNote(event.target.value)
              setMessage("")
            }}
            disabled={saving || voiceBusy || photoBusy || retryOnly}
            required
            maxLength={noteLimit}
            rows={2}
            placeholder={
              reviewPeriod
                ? "Something I want to keep doing…"
                : "Today, I noticed…"
            }
            className="mt-2 w-full resize-none overflow-hidden border-0 border-b border-border bg-transparent p-0 pb-3 font-[family-name:var(--font-display)] text-xl leading-8 outline-none placeholder:text-muted-foreground/70 focus-visible:border-foreground focus-visible:ring-0"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            {!stepExpanded && (
              <button
                type="button"
                onClick={() => setStepExpanded(true)}
                className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground active:opacity-60"
              >
                Next step
              </button>
            )}
            <label className="inline-flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground transition-colors hover:text-foreground active:opacity-60">
              {photoBusy
                ? "Preparing photo…"
                : photo
                  ? "Photo added"
                  : "Photo"}
              <input
                id="checkin-photo"
                type="file"
                accept="image/*"
                disabled={saving || voiceBusy || photoBusy || retryOnly}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.currentTarget.value = ""
                  if (!file) return
                  const identity = getStorageIdentity()
                  setError("")
                  setPhotoBusy(true)
                  void encodeJournalPhoto(file).then((result) => {
                    if (identity !== getStorageIdentity()) return
                    setPhotoBusy(false)
                    if (!result.ok || !result.photo) {
                      setError(
                        result.ok
                          ? "This photo couldn’t be added. Try another image."
                          : result.error
                      )
                      return
                    }
                    setPhoto(result.photo)
                    setMessage("")
                  })
                }}
                className="sr-only"
              />
            </label>
          </div>
          <Button
            type="submit"
            variant="ghost"
            disabled={saving || voiceBusy || photoBusy || !ready || !note.trim()}
            className="min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium text-foreground transition-opacity disabled:opacity-30"
          >
            {saving ? "Saving…" : reviewPeriod ? "Save reflection" : "Save"}
          </Button>
        </div>
        {iosDictation && (
          <details
            className="group"
            onToggle={(event) => {
              if (voiceBusy) event.currentTarget.open = true
            }}
          >
            <summary className="min-h-11 cursor-pointer py-2 text-sm text-muted-foreground">
              Use dictation
            </summary>
            <div className="pb-3">
              <DictationControl
                note={note}
                limit={noteLimit}
                disabled={!ready || saving || retryOnly || photoBusy}
                onBusy={setVoiceBusy}
                onInsert={(value) => {
                  remember(value, nextStep)
                  setNote(value)
                  setMessage("")
                }}
              />
            </div>
          </details>
        )}
        {stepExpanded && (
          <div>
            <label htmlFor="checkin-next" className="sr-only">
              Next step
            </label>
            <input
              id="checkin-next"
              disabled={saving || voiceBusy || photoBusy || retryOnly}
              value={nextStep}
              onChange={(event) => {
                remember(note, event.target.value)
                setNextStep(event.target.value)
              }}
              maxLength={LIMITS.intentionMax}
              placeholder="Open the document. Or take a break."
              className="min-h-12 w-full border-0 border-b border-border bg-transparent p-0 text-base outline-none focus-visible:border-foreground focus-visible:ring-0"
            />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {reviewPeriod
                ? "It stays on Today until you finish it, change it, or let it go."
                : "This becomes today’s focus. Leave it empty to keep the current one."}
            </p>
          </div>
        )}
        {photo && (
          <div>
            {/* Journal photos are local JPEG data URLs; next/image cannot optimize them. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={journalPhotoSrc(photo)}
              alt="Photo to attach to this note"
              className="max-h-56 w-full rounded-xl bg-muted object-contain"
            />
            <button
              type="button"
              disabled={saving || photoBusy}
              className="mt-1 inline-flex min-h-11 items-center text-sm text-muted-foreground"
              onClick={() => setPhoto(undefined)}
            >
              Remove photo
            </button>
          </div>
        )}
        {(note || nextStep) && (
          <p className="text-xs leading-5 text-muted-foreground">
            {signedIn
              ? "Drafts stay on this device. Saved notes can sync."
              : "Stays on this device until you save."}
          </p>
        )}
      </form>
      <p
        role="status"
        aria-live="polite"
        className={message ? "mt-3 min-h-6 text-sm text-primary" : "sr-only"}
      >
        {message}
      </p>
    </>
  )
}
