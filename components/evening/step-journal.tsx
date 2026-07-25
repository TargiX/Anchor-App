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
    ? `You started the day wanting to ${intention.toLowerCase()}. ${selectedLens?.prompt ?? "How did that land?"}`
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
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Reflection
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-medium text-balance text-foreground lg:text-4xl">
          {prompt}
        </h2>
      </div>

      {intention && (
        <section
          aria-labelledby="intention-anchor-title"
          className="rounded-2xl border border-accent/30 bg-accent/5 px-5 py-4"
        >
          <p
            id="intention-anchor-title"
            className="text-xs font-medium tracking-widest text-muted-foreground uppercase"
          >
            This morning&apos;s intention
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-base leading-relaxed text-foreground italic">
            &ldquo;{intention}&rdquo;
          </p>
          <div
            className="mt-4"
            role="group"
            aria-label="Choose a reflection lens"
          >
            <p className="text-xs text-muted-foreground">Choose a lens</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTENTION_LENSES.map((lens) => (
                <button
                  key={lens.id}
                  type="button"
                  aria-pressed={intentionLens === lens.id}
                  onClick={() => setIntentionLens(lens.id)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                    intentionLens === lens.id
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground"
                  )}
                >
                  {lens.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="relative flex flex-1 flex-col gap-2">
        <label
          htmlFor="journal-reflection"
          className="text-xs font-medium tracking-widest text-muted-foreground uppercase"
        >
          Your reflection
        </label>
        <textarea
          id="journal-reflection"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write whatever wants to come out..."
          rows={8}
          className={cn(
            "min-h-[200px] w-full flex-1 resize-none rounded-2xl border border-border bg-card",
            "px-5 py-4 text-base text-foreground placeholder:text-muted-foreground",
            "transition-shadow focus:ring-2 focus:ring-ring focus:outline-none",
            "font-[family-name:var(--font-display)] leading-relaxed"
          )}
          maxLength={LIMITS.journalMax}
        />
        {text.trim().length > 0 && (
          <span className="absolute right-4 bottom-3 text-xs text-muted-foreground">
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
