"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { updateTodayEntry } from "@/lib/store"
import { AnchorMotif } from "@/components/anchor-motif"

interface StepSleepTargetProps {
  onNext: () => void
  onBack: () => void
}

const BEDTIME_OPTIONS = ["21:00", "21:30", "22:00", "22:30", "23:00", "23:30", "00:00", "00:30", "01:00"]

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number)
  const period = h < 12 ? "AM" : "PM"
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${String(m).padStart(2, "0")} ${period}`
}

export function StepSleepTarget({ onNext, onBack }: StepSleepTargetProps) {
  const [bedtime, setBedtime] = useState("22:30")
  const [hours, setHours] = useState(8)

  function handleNext() {
    updateTodayEntry({ tomorrowBedtime: bedtime, tomorrowSleepHours: hours })
    onNext()
  }

  return (
    <div className="flex flex-col flex-1 gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Tomorrow
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground text-balance leading-snug">
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
              onClick={() => setBedtime(t)}
              className={`px-3 py-2 rounded-xl border text-sm transition-all ${
                bedtime === t
                  ? "border-accent bg-accent/10 text-foreground font-medium"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30"
              }`}
            >
              {formatTime(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Sleep hours */}
      <div className="bg-card rounded-2xl border border-border px-5 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground font-medium">Sleep goal</p>
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
        <p className="text-sm text-center text-muted-foreground font-[family-name:var(--font-display)] italic max-w-[240px]">
          Rest well. Tomorrow begins in the morning.
        </p>
      </div>

      {/* Nav */}
      <div className="mt-auto pb-10 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-none rounded-2xl h-14 px-6">
          Back
        </Button>
        <Button
          onClick={handleNext}
          className="flex-1 rounded-2xl h-14 text-base font-medium"
        >
          Close the day
        </Button>
      </div>
    </div>
  )
}
