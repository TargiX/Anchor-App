"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateTodayEntry } from "@/lib/store"
import { LIMITS } from "@/lib/domain/validation"
import { useTodayEntry } from "@/hooks/use-store"
import { pickDailyItems } from "@/lib/time/daily-index"

const PROMPTS = [
  "Bring more ease to what I'm working on",
  "Be fully present with the people I love",
  "Let go of what I can't control today",
  "Move through the day without rushing",
  "Notice the small moments of beauty",
  "Take one meaningful step forward",
]

interface StepIntentionProps {
  onNext: () => void
  onBack: () => void
}

export function StepIntention({ onNext, onBack }: StepIntentionProps) {
  const today = useTodayEntry()
  const [text, setText] = useState(today.intention ?? "")
  const [suggestions] = useState(() => pickDailyItems(PROMPTS, 3, "intention"))

  function handleNext() {
    if (!text.trim()) return
    updateTodayEntry({ intention: text.trim() })
    onNext()
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Intention
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-snug font-medium text-balance text-foreground">
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
            type="button"
            onClick={() => setText(s)}
            aria-pressed={text === s}
            className={cn(
              "rounded-xl border px-4 py-3.5 text-left text-sm text-foreground transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
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
          onClick={onBack}
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
