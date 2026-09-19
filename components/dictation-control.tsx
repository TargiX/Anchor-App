"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Capacitor, registerPlugin } from "@capacitor/core"
import { Mic, Square, X } from "lucide-react"
import {
  appendDictation,
  createDictationSession,
  type DictationPhase,
  type DictationPort,
} from "@/lib/native/dictation"

const subscribePlatform = () => () => {}
const isIOS = () => Capacitor.getPlatform() === "ios"
const serverPlatform = () => false

export function useIosDictation() {
  return useSyncExternalStore(subscribePlatform, isIOS, serverPlatform)
}

export function DictationControl(
  props: Parameters<typeof NativeDictationControl>[0]
) {
  const native = useIosDictation()
  return native ? <NativeDictationControl {...props} /> : null
}

function NativeDictationControl({
  note,
  limit,
  disabled,
  onInsert,
  onBusy,
}: {
  note: string
  limit: number
  disabled: boolean
  onInsert(value: string): void
  onBusy(value: boolean): void
}) {
  const [locale, setLocale] = useState(() =>
    navigator.language.startsWith("ru") ? "ru-RU" : "en-US"
  )
  const [availability, setAvailability] = useState<{
    locale: string
    supported: boolean
  } | null>(null)
  const supported =
    availability?.locale === locale ? availability.supported : null
  const [phase, setPhase] = useState<
    DictationPhase | "idle" | "review" | "error"
  >("idle")
  const [draft, setDraft] = useState("")
  const [notice, setNotice] = useState("")
  const controller = useRef<ReturnType<typeof createDictationSession> | null>(
    null
  )

  useEffect(() => {
    const port = registerPlugin<DictationPort>("AnchorDictation")
    controller.current = createDictationSession(port, {
      phase: setPhase,
      result(result) {
        if (result.reason === "cancelled") {
          setPhase("idle")
          return
        }
        setDraft(result.text)
        setNotice(
          result.text.trim()
            ? result.reason === "interrupted"
              ? "Dictation was interrupted. Review the words captured so far."
              : "Review and edit these words before adding them."
            : "No words were recognized. Try again or type your note."
        )
        setPhase(result.text.trim() ? "review" : "error")
      },
      error() {
        setNotice(
          "Dictation couldn’t finish. Check microphone and speech permissions in Settings, then try again. Your typed note is unchanged."
        )
        setPhase("error")
      },
    })
    return () => {
      controller.current?.cancel()
      controller.current = null
      onBusy(false)
    }
  }, [onBusy])

  useEffect(() => {
    let cancelled = false
    registerPlugin<DictationPort>("AnchorDictation")
      .availability({ locale })
      .then((result) => {
        if (!cancelled) setAvailability({ locale, supported: result.supported })
      })
      .catch(() => {
        if (!cancelled) setAvailability({ locale, supported: false })
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  const busy =
    phase === "starting" || phase === "recording" || phase === "finishing"
  useEffect(() => {
    onBusy(busy || phase === "review")
  }, [busy, phase, onBusy])
  const combined = appendDictation(note, draft, limit)
  return (
    <section aria-label="Voice draft" className="mt-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs text-muted-foreground">
          Dictation language
          <select
            aria-label="Dictation language"
            value={locale}
            disabled={busy || phase === "review"}
            onChange={(event) => {
              setLocale(event.target.value)
              setPhase("idle")
              setNotice("")
            }}
            className="ml-2 min-h-11 rounded-lg bg-background px-2 text-sm text-foreground"
          >
            <option value="en-US">English</option>
            <option value="ru-RU">Русский</option>
          </select>
        </label>
        {!busy && phase !== "review" && (
          <button
            type="button"
            disabled={disabled || supported !== true}
            onClick={() => {
              setNotice("")
              void controller.current?.start(locale)
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-primary disabled:opacity-40"
          >
            <Mic className="size-4" />
            Dictate
          </button>
        )}
        {busy && (
          <div className="flex gap-2">
            {phase === "recording" && (
              <button
                type="button"
                onClick={() => {
                  void controller.current?.stop()
                }}
                className="inline-flex min-h-11 items-center gap-2 px-3 text-sm"
              >
                <Square className="size-4" />
                Stop
              </button>
            )}
            <button
              type="button"
              aria-label="Cancel dictation"
              onClick={() => {
                controller.current?.cancel()
                setPhase("idle")
                setNotice("")
              }}
              className="flex size-11 items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>
      <p role="status" className="mt-1 text-xs leading-5 text-muted-foreground">
        {busy
          ? (
              {
                starting: "Waiting for permission…",
                recording: "Listening… Stops automatically after one minute.",
                finishing: "Finishing your voice draft…",
              } as Record<string, string>
            )[phase]
          : supported === false
            ? "On-device dictation is unavailable for this language on this device. You can still type."
            : "Audio stays on this device and is not saved. Only text you choose to add becomes part of your note."}
      </p>
      {notice && (
        <p role="status" className="mt-2 text-sm">
          {notice}
        </p>
      )}
      {phase === "review" && (
        <div className="mt-3 space-y-2">
          <label htmlFor="voice-draft" className="text-sm font-medium">
            Voice draft
          </label>
          <textarea
            id="voice-draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-background p-3 text-base"
          />
          {combined === null && draft.trim() && (
            <p role="alert" className="text-xs text-destructive">
              Shorten this draft to fit the {limit}-character note limit. No
              words have been removed.
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={combined === null}
              onClick={() => {
                if (combined !== null) {
                  onInsert(combined)
                  setDraft("")
                  setNotice("")
                  setPhase("idle")
                }
              }}
              className="min-h-11 rounded-lg bg-primary px-4 text-sm text-primary-foreground disabled:opacity-40"
            >
              Add to note
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft("")
                setNotice("")
                setPhase("idle")
              }}
              className="min-h-11 px-3 text-sm"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
