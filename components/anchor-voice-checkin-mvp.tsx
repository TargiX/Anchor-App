"use client"

import { useEffect, useMemo, useState } from "react"
import { Mic, Send, Sparkles, BarChart3, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AnchorCheckIn, CheckInKind } from "@/lib/anchor-checkin/checkin"

type ApiResponse = {
  records?: AnchorCheckIn[]
  checkIn?: AnchorCheckIn
  reflection?: string
  digest?: string
  error?: string
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

const EXAMPLE_TRANSCRIPT =
  "бля, спал плохо, голова тяжёлая, сегодня надо добить PR и не забыть маме позвонить"

function lines(text: string | undefined): string[] {
  return text?.split("\n").filter(Boolean) ?? []
}

export function AnchorVoiceCheckInMvp() {
  const [kind, setKind] = useState<CheckInKind>("morning")
  const [transcript, setTranscript] = useState("")
  const [records, setRecords] = useState<AnchorCheckIn[]>([])
  const [reflection, setReflection] = useState("")
  const [digest, setDigest] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)

  useEffect(() => {
    void fetch("/api/anchor-checkins", { cache: "no-store" })
      .then((res) => res.json() as Promise<ApiResponse>)
      .then((data) => {
        setRecords(data.records ?? [])
        setDigest(data.digest ?? "")
      })
      .catch(() => setError("Не смог загрузить локальные чек-ины."))
  }, [])

  const latestMain = useMemo(
    () => [...records].reverse().find((record) => record.intention.main)?.intention.main,
    [records]
  )

  async function submitCheckIn() {
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/anchor-checkins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript, kind }),
      })
      const data = (await response.json()) as ApiResponse
      if (!response.ok) throw new Error(data.error ?? "Check-in failed")
      if (data.checkIn) setRecords((prev) => [...prev, data.checkIn as AnchorCheckIn])
      setReflection(data.reflection ?? "")
      setDigest(data.digest ?? "")
      setTranscript("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не смог записать чек-ин.")
    } finally {
      setLoading(false)
    }
  }

  function startBrowserVoice() {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError("В этом браузере нет Web Speech API. Пока просто вставь текст расшифровки.")
      return
    }

    setError("")
    const recognition = new SpeechRecognition()
    recognition.lang = "ru-RU"
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim()
      setTranscript((prev) => [prev, text].filter(Boolean).join(" "))
    }
    recognition.onerror = () => {
      setError("Голосовой ввод сорвался. Не страшно — напиши кашу текстом.")
      setListening(false)
    }
    recognition.onend = () => setListening(false)
    setListening(true)
    recognition.start()
  }

  return (
    <main className="min-h-dvh px-5 py-7 lg:px-10 lg:py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-[2rem] border border-border bg-card/70 p-5 shadow-sm lg:p-8">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Anchor MVP
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold text-foreground lg:text-6xl">
                Voice check-in, no journal guilt.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground lg:text-base">
                Наговори кашу на 10–30 секунд. MVP вытащит состояние, сон,
                одну главную вещь и хвосты. Это проверка петли, не красивая аппка.
              </p>
            </div>
            <Sparkles className="mt-2 size-6 shrink-0 text-primary" />
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-muted/45 p-1">
            {(["morning", "evening", "spontaneous"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setKind(option)}
                className={`rounded-xl px-3 py-2 text-sm transition ${
                  kind === option
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option === "morning" ? "Утро" : option === "evening" ? "Вечер" : "Мысль"}
              </button>
            ))}
          </div>

          {kind === "evening" && latestMain ? (
            <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              Утренний якорь: <span className="font-medium text-foreground">{latestMain}</span>
            </div>
          ) : null}

          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder={EXAMPLE_TRANSCRIPT}
            className="min-h-44 w-full resize-none rounded-2xl border border-border bg-background/70 p-4 text-base leading-7 text-foreground outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={startBrowserVoice}
              disabled={loading || listening}
              className="h-11 rounded-xl"
            >
              <Mic className="size-4" />
              {listening ? "Слушаю..." : "Надиктовать"}
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={submitCheckIn}
              disabled={loading || transcript.trim().length === 0}
              className="h-11 rounded-xl"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Разобрать чек-ин
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setTranscript(EXAMPLE_TRANSCRIPT)}
              disabled={loading}
              className="h-11 rounded-xl"
            >
              Пример
            </Button>
          </div>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

          {reflection ? (
            <section className="mt-7 rounded-2xl border border-border bg-background/80 p-5">
              <p className="mb-3 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Immediate reflection
              </p>
              <div className="space-y-1 text-base leading-7 text-foreground">
                {lines(reflection).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-[1.75rem] border border-border bg-card/70 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                Weekly facts
              </h2>
            </div>
            <div className="space-y-2 text-sm leading-6 text-muted-foreground">
              {lines(digest).map((line) => (
                <p key={line} className={line.startsWith("📊") ? "font-medium text-foreground" : ""}>
                  {line}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-border bg-card/70 p-5 shadow-sm">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Local records
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{records.length}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Хранится локально на машине в JSONL. Без стриков, без оценок продуктивности,
              без терапевтического театра.
            </p>
          </section>
        </aside>
      </div>
    </main>
  )
}
