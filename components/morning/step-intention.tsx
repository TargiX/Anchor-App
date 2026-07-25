"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateEntry } from "@/lib/store/actions"
import { useEntry } from "@/hooks/use-store"
import { LIMITS } from "@/lib/domain/validation"

const PROMPTS = [
  "Bring more ease to what I'm working on",
  "Be fully present with the people I love",
  "Let go of what I can't control today",
  "Move through the day without rushing",
  "Notice the small moments of beauty",
  "Take one meaningful step forward",
]

export function getIntentionSuggestions() {
  const shuffled = [...PROMPTS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

interface StepIntentionProps {
  entryKey: string
  suggestions: string[]
  onNext: () => void
  onBack: () => void
}

export function StepIntention({
  entryKey,
  suggestions,
  onNext,
  onBack,
}: StepIntentionProps) {
  const today = useEntry(entryKey)
  // Default empty for first render; effect syncs the hydrated intention
  // once useAppState finishes loading from storage. See step-sleep for the
  // set-state-in-effect rationale.
  const [text, setText] = useState("")

  /* eslint-disable react-hooks/set-state-in-effect -- sync from external store */
  useEffect(() => {
    if (today.intention !== undefined) setText(today.intention)
  }, [today.intention])
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleNext() {
    if (!text.trim()) return
    updateEntry(entryKey, { intention: text.trim() })
    onNext()
  }

  function handleBack() {
    if (text.trim()) updateEntry(entryKey, { intention: text.trim() })
    onBack()
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Intention
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-medium text-balance text-foreground lg:text-4xl">
          Today I want to&hellip;
        </h2>
      </div>

      {/* Text input */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your intention for today..."
          rows={3}
          className={cn(
            "w-full resize-none rounded-2xl border border-border bg-card",
            "px-5 py-4 text-base text-foreground placeholder:text-muted-foreground",
            "transition-shadow focus:ring-2 focus:ring-ring focus:outline-none",
            "font-[family-name:var(--font-display)] leading-relaxed"
          )}
          maxLength={LIMITS.intentionMax}
        />
        <span className="absolute right-4 bottom-3 text-xs text-muted-foreground">
          {text.length}/{LIMITS.intentionMax}
        </span>
      </div>

      {/* AI-style suggestions */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Or try one of these
        </p>
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => setText(s)}
            className={cn(
              "rounded-xl border px-4 py-3.5 text-left text-sm text-foreground transition-all duration-200",
              text === s
                ? "border-accent bg-accent/10"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            {s}
          </button>
        ))}
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
          onClick={handleNext}
          disabled={!text.trim()}
          className="h-14 flex-1 rounded-2xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
