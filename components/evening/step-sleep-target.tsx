"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { updateTodayEntry } from "@/lib/store"
import { AnchorMotif } from "@/components/anchor-motif"
import { useTodayEntry } from "@/hooks/use-store"
import { cn } from "@/lib/utils"

interface StepSleepTargetProps {
  onNext: () => void
  onBack: () => void
}

const BEDTIME_OPTIONS = [
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
  "00:00",
  "00:30",
  "01:00",
]

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  const period = h < 12 ? "AM" : "PM"
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${String(m).padStart(2, "0")} ${period}`
}

export function StepSleepTarget({ onNext, onBack }: StepSleepTargetProps) {
  const today = useTodayEntry()
  const [bedtime, setBedtime] = useState(today.tomorrowBedtime ?? "22:30")
  const [hours, setHours] = useState(today.tomorrowSleepHours ?? 8)

  function handleNext() {
    updateTodayEntry({ tomorrowBedtime: bedtime, tomorrowSleepHours: hours })
    onNext()
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Tomorrow
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-snug font-medium text-balance text-foreground">
          Set yourself up for a good night.
        </h2>
      </div>

      {/* Bedtime picker */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">Bedtime target</p>
        <div className="flex flex-wrap gap-2">
          {BEDTIME_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setBedtime(t)}
              aria-pressed={bedtime === t}
              aria-label={`Set bedtime target to ${formatTime(t)}`}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                bedtime === t
                  ? "border-accent bg-accent/10 font-medium text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30"
              )}
            >
              {formatTime(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Sleep hours */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Sleep goal</p>
          <p className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground">
            {hours}h
          </p>
        </div>
        <Slider
          min={5}
          max={10}
          step={0.5}
          value={[hours]}
          onValueChange={([v]) => setHours(v)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>5h</span>
          <span>10h</span>
        </div>
      </div>

      {/* Closing motif */}
      <div className="flex flex-col items-center gap-3 py-4">
        <AnchorMotif size={80} className="text-primary opacity-50" />
        <p className="max-w-[240px] text-center font-[family-name:var(--font-display)] text-sm text-muted-foreground italic">
          Rest well. Tomorrow begins in the morning.
        </p>
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
          className="h-14 flex-1 rounded-2xl text-base font-medium"
        >
          Close the day
        </Button>
      </div>
    </div>
  )
}
