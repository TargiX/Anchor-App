"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateTodayEntry } from "@/lib/store"
import { LIMITS } from "@/lib/domain/validation"

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
  const [text, setText] = useState("")
  const [suggestions] = useState(() => {
    const shuffled = [...PROMPTS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3)
  })

  function handleNext() {
    if (!text.trim()) return
    updateTodayEntry({ intention: text.trim() })
    onNext()
  }

  return (
    <div className="flex flex-col flex-1 gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Intention
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground text-balance leading-snug">
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
            "focus:outline-none focus:ring-2 focus:ring-ring transition-shadow",
            "font-[family-name:var(--font-display)] leading-relaxed"
          )}
          maxLength={LIMITS.intentionMax}
        />
        <span className="absolute bottom-3 right-4 text-xs text-muted-foreground">
          {text.length}/{LIMITS.intentionMax}
        </span>
      </div>

      {/* AI-style suggestions */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
          Or try one of these
        </p>
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => setText(s)}
            className={cn(
              "text-left px-4 py-3.5 rounded-xl border text-sm text-foreground transition-all duration-200",
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
      <div className="mt-auto pb-10 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-none rounded-2xl h-14 px-6">
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!text.trim()}
          className="flex-1 rounded-2xl h-14 text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
