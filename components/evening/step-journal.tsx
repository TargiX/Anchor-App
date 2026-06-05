"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateTodayEntry } from "@/lib/store"
import { useAppState } from "@/hooks/use-store"
import { getTodayKey } from "@/lib/time/today"
import { LIMITS, countWords } from "@/lib/domain/validation"

const FALLBACK_PROMPTS = [
  "How did today actually feel, beneath all the doing?",
  "What surprised you today — big or small?",
  "What are you grateful for from the last 24 hours?",
  "Where did you feel most like yourself today?",
]

interface StepJournalProps {
  onNext: () => void
  onBack: () => void
}

export function StepJournal({ onNext, onBack }: StepJournalProps) {
  const state = useAppState()
  const today = state.entries[getTodayKey()]
  const intention = today?.intention

  const [promptIndex] = useState(() =>
    Math.floor(Math.random() * FALLBACK_PROMPTS.length)
  )

  const prompt = intention
    ? `You started the day wanting to ${intention.toLowerCase()}. How did that land?`
    : FALLBACK_PROMPTS[promptIndex]
  const [text, setText] = useState(today?.journal ?? "")

  function handleNext() {
    updateTodayEntry({ journal: text.trim() })
    onNext()
  }

  return (
    <div className="flex flex-col flex-1 gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Reflection
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground text-balance leading-snug">
          {prompt}
        </h2>
      </div>

      <div className="relative flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write whatever wants to come out..."
          rows={8}
          className={cn(
            "w-full h-full min-h-[200px] resize-none rounded-2xl border border-border bg-card",
            "px-5 py-4 text-base text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring transition-shadow",
            "font-[family-name:var(--font-display)] leading-relaxed"
          )}
          maxLength={LIMITS.journalMax}
        />
        {text.trim().length > 0 && (
          <span className="absolute bottom-3 right-4 text-xs text-muted-foreground">
            {countWords(text)} {countWords(text) === 1 ? "word" : "words"}
          </span>
        )}
      </div>

      {/* Nav */}
      <div className="mt-auto pb-10 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-none rounded-2xl h-14 px-6">
          Back
        </Button>
        <Button
          variant="outline"
          onClick={() => { updateTodayEntry({ journal: "" }); onNext() }}
          className="flex-none rounded-2xl h-14 px-5"
        >
          Skip
        </Button>
        <Button
          onClick={handleNext}
          className="flex-1 rounded-2xl h-14 text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
