"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateEntry } from "@/lib/store/actions"
import { useEntry } from "@/hooks/use-store"
import { LIMITS, countWords } from "@/lib/domain/validation"

const FALLBACK_PROMPTS = [
  "How did today actually feel, beneath all the doing?",
  "What surprised you today — big or small?",
  "What are you grateful for from the last 24 hours?",
  "Where did you feel most like yourself today?",
]

const INTENTION_LENSES = [
  {
    id: "held",
    label: "It held",
    prompt: "Where did it support you today?",
  },
  {
    id: "shifted",
    label: "It shifted",
    prompt: "What got in the way, or changed?",
  },
  {
    id: "forward",
    label: "Carry forward",
    prompt: "What do you want to bring into tomorrow?",
  },
] as const

type IntentionLens = (typeof INTENTION_LENSES)[number]["id"]

interface StepJournalProps {
  entryKey: string
  onNext: () => void
  onBack: () => void
}

export function StepJournal({ entryKey, onNext, onBack }: StepJournalProps) {
  const today = useEntry(entryKey)
  const intention = today?.intention
  const [intentionLens, setIntentionLens] = useState<IntentionLens>("held")

  const [promptIndex] = useState(() =>
    Math.floor(Math.random() * FALLBACK_PROMPTS.length)
  )

  const selectedLens = INTENTION_LENSES.find(
    (lens) => lens.id === intentionLens
  )

  const prompt = intention
    ? (selectedLens?.prompt ?? "How did that land?")
    : FALLBACK_PROMPTS[promptIndex]
  const [text, setText] = useState(today?.journal ?? "")

  /* eslint-disable react-hooks/set-state-in-effect -- sync from external store */
  useEffect(() => {
    setText(today.journal ?? "")
  }, [entryKey, today.journal])
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleNext() {
    updateEntry(entryKey, { journal: text.trim() })
    onNext()
  }

  function handleBack() {
    updateEntry(entryKey, { journal: text.trim() })
    onBack()
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs font-medium text-muted-foreground">Reflection</p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-balance text-foreground lg:text-4xl">
          {intention ? "How did today land?" : prompt}
        </h2>
        {intention ? (
          <p className="text-sm leading-6 text-muted-foreground">{prompt}</p>
        ) : null}
      </div>

      {intention && (
        <section aria-labelledby="intention-anchor-title">
          <p id="intention-anchor-title" className="sr-only">
            This morning&apos;s intention
          </p>
          <p className="font-[family-name:var(--font-display)] text-lg leading-relaxed text-foreground">
            &ldquo;{intention}&rdquo;
          </p>
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Choose a reflection lens"
          >
            {INTENTION_LENSES.map((lens) => (
              <button
                key={lens.id}
                type="button"
                aria-pressed={intentionLens === lens.id}
                onClick={() => setIntentionLens(lens.id)}
                className={cn(
                  "min-h-11 px-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  intentionLens === lens.id
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {lens.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="relative flex flex-1 flex-col gap-2">
        <label htmlFor="journal-reflection" className="sr-only">
          Your reflection
        </label>
        <textarea
          id="journal-reflection"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write whatever wants to come out..."
          rows={8}
          className={cn(
            "min-h-[200px] w-full flex-1 resize-none border-0 border-b border-border bg-transparent p-0 pb-3",
            "text-xl leading-8 text-foreground placeholder:text-muted-foreground/70",
            "outline-none focus-visible:border-foreground focus-visible:ring-0",
            "font-[family-name:var(--font-display)]"
          )}
          maxLength={LIMITS.journalMax}
        />
        {text.trim().length > 0 && (
          <span className="absolute right-0 bottom-0 text-xs text-muted-foreground">
            {countWords(text)} {countWords(text) === 1 ? "word" : "words"}
          </span>
        )}
      </div>

      {/* Nav */}
      <div className="mt-auto flex gap-3 pb-10">
        <Button
          variant="outline"
          onClick={handleBack}
          className="h-14 flex-none rounded-2xl px-6"
        >
          Back
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            updateEntry(entryKey, { journal: "" })
            onNext()
          }}
          className="h-14 flex-none rounded-2xl px-5"
        >
          Skip
        </Button>
        <Button
          onClick={handleNext}
          className="h-14 flex-1 rounded-2xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
