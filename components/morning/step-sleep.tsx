"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { updateEntry } from "@/lib/store/actions"
import { useEntry } from "@/hooks/use-store"
import { SLEEP_QUALITY_LABEL, type SleepQuality } from "@/lib/domain/entry"

const SLEEP_OPTIONS = (
  Object.entries(SLEEP_QUALITY_LABEL) as [SleepQuality, string][]
).map(([value, label]) => ({ value, label }))

interface StepSleepProps {
  entryKey: string
  onNext: () => void
  onBack: () => void
}

export function StepSleep({ entryKey, onNext, onBack }: StepSleepProps) {
  const today = useEntry(entryKey)
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
    updateEntry(entryKey, { sleepQuality: quality, sleepHours: hours })
    onNext()
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-balance text-foreground lg:text-4xl">
          How did last night feel?
        </h2>
      </div>

      {/* Sleep quality picker */}
      <div className="flex justify-between gap-2">
        {SLEEP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setQuality(opt.value)}
            aria-pressed={quality === opt.value}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center py-2 text-sm transition-colors duration-200",
              quality === opt.value
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Hours slider */}
      <div className="flex flex-col gap-4">
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
          onValueChange={([v]) => setHours(v ?? 8)}
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
