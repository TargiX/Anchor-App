"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { updateEntry } from "@/lib/store/actions"
import { useEntry } from "@/hooks/use-store"

interface StepSleepTargetProps {
  entryKey: string
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
  const parts = t.split(":").map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const period = h < 12 ? "AM" : "PM"
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${String(m).padStart(2, "0")} ${period}`
}

export function StepSleepTarget({
  entryKey,
  onNext,
  onBack,
}: StepSleepTargetProps) {
  const entry = useEntry(entryKey)
  const [bedtime, setBedtime] = useState("22:30")
  const [hours, setHours] = useState(8)

  /* eslint-disable react-hooks/set-state-in-effect -- sync from external store */
  useEffect(() => {
    setBedtime(entry.tomorrowBedtime ?? "22:30")
    setHours(entry.tomorrowSleepHours ?? 8)
  }, [entryKey, entry.tomorrowBedtime, entry.tomorrowSleepHours])
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleNext() {
    updateEntry(entryKey, {
      tomorrowBedtime: bedtime,
      tomorrowSleepHours: hours,
    })
    onNext()
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs font-medium text-muted-foreground">Tomorrow</p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-balance text-foreground lg:text-4xl">
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
              className={`min-h-11 px-1 text-sm transition-colors ${
                bedtime === t
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {formatTime(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Sleep hours */}
      <div className="flex flex-col gap-4">
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
          onValueChange={([v]) => setHours(v ?? 8)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>5h</span>
          <span>10h</span>
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
          className="h-14 flex-1 rounded-2xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
