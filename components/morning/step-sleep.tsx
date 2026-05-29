"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { updateTodayEntry } from "@/lib/store"
import { type SleepQuality } from "@/lib/domain/entry"
import { useTodayEntry } from "@/hooks/use-store"

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
  const [quality, setQuality] = useState<SleepQuality | null>(
    today.sleepQuality ?? null
  )
  const [hours, setHours] = useState(today.sleepHours ?? 7)

  function handleNext() {
    if (!quality) return
    updateTodayEntry({ sleepQuality: quality, sleepHours: hours })
    onNext()
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Sleep
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-snug font-medium text-balance text-foreground">
          How did last night feel?
        </h2>
      </div>

      {/* Sleep quality picker */}
      <div className="flex justify-between gap-2">
        {SLEEP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setQuality(opt.value)}
            aria-pressed={quality === opt.value}
            aria-label={`Sleep quality: ${opt.label}`}
            className={cn(
              "flex flex-1 flex-col items-center gap-2 rounded-2xl border py-4 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              quality === opt.value
                ? "scale-105 border-accent bg-accent/10"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            <span className="text-2xl">{opt.glyph}</span>
            <span className="text-xs font-medium text-muted-foreground">
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      {/* Hours slider */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Hours slept</p>
          <p className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground">
            {hours}h
          </p>
        </div>
        <Slider
          min={2}
          max={12}
          step={0.5}
          value={[hours]}
          onValueChange={([v]) => setHours(v)}
          className="py-1"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>2h</span>
          <span>12h</span>
        </div>
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
          disabled={!quality}
          className="h-14 flex-1 rounded-2xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
