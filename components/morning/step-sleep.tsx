"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { updateTodayEntry } from "@/lib/store/actions"
import { useTodayEntry } from "@/hooks/use-store"
import { type SleepQuality } from "@/lib/domain/entry"

const SLEEP_OPTIONS: { value: SleepQuality; label: string; glyph: string }[] = [
  { value: "terrible", label: "Rough", glyph: "😶" },
  { value: "poor", label: "Poor", glyph: "😔" },
  { value: "okay", label: "Okay", glyph: "😌" },
  { value: "good", label: "Good", glyph: "🌙" },
  { value: "great", label: "Great", glyph: "✨" },
]

interface StepSleepProps {
  onNext: () => void
  onBack: () => void
}

export function StepSleep({ onNext, onBack }: StepSleepProps) {
  const today = useTodayEntry()
  // Defaults for first render; effect below syncs the hydrated entry after
  // useAppState finishes loading from storage. Initializing via useState(saved)
  // only would freeze the pre-hydration (empty) values and miss the persisted
  // entry on app launch. The set-state-in-effect lint rule is disabled here
  // because this is exactly the documented "sync from external source" pattern
  // (see react.dev/learn/you-might-not-need-an-effect#subscribing-to-a-store).
  const [quality, setQuality] = useState<SleepQuality | null>(null)
  const [hours, setHours] = useState(7)

  /* eslint-disable react-hooks/set-state-in-effect -- sync from external store */
  useEffect(() => {
    if (today.sleepQuality !== undefined) setQuality(today.sleepQuality)
    if (today.sleepHours !== undefined) setHours(today.sleepHours)
  }, [today.sleepQuality, today.sleepHours])
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleNext() {
    if (!quality) return
    updateTodayEntry({ sleepQuality: quality, sleepHours: hours })
    onNext()
  }

  return (
    <div className="flex flex-col flex-1 gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Sleep
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground text-balance leading-snug">
          How did last night feel?
        </h2>
      </div>

      {/* Sleep quality picker */}
      <div className="flex justify-between gap-2">
        {SLEEP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setQuality(opt.value)}
            className={cn(
              "flex flex-col items-center gap-2 flex-1 py-4 rounded-2xl border transition-all duration-200",
              quality === opt.value
                ? "border-accent bg-accent/10 scale-105"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            <span className="text-2xl">{opt.glyph}</span>
            <span className="text-xs text-muted-foreground font-medium">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Hours slider */}
      <div className="bg-card rounded-2xl border border-border px-5 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground font-medium">Hours slept</p>
          <p className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground">
            {hours}h
          </p>
        </div>
        <Slider
          min={2}
          max={12}
          step={0.5}
          value={[hours]}
          onValueChange={([v]) => setHours(v ?? 8)}
          className="py-1"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>2h</span>
          <span>12h</span>
        </div>
      </div>

      {/* Nav */}
      <div className="mt-auto pb-10 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-none rounded-2xl h-14 px-6">
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!quality}
          className="flex-1 rounded-2xl h-14 text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
