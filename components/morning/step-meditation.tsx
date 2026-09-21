"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateEntry } from "@/lib/store/actions"
import { useEntry } from "@/hooks/use-store"
import { motion, useReducedMotion } from "framer-motion"
import { captureEvent } from "@/lib/analytics/client"

const DURATIONS = [2, 5, 10]

interface StepMeditationProps {
  entryKey: string
  onNext: () => void
  onBack: () => void
}

export function StepMeditation({
  entryKey,
  onNext,
  onBack,
}: StepMeditationProps) {
  const today = useEntry(entryKey)
  const shouldReduceMotion = useReducedMotion()
  // Defaults for first render; effect syncs the hydrated meditationMinutes
  // once useAppState finishes loading from storage. See step-sleep for the
  // set-state-in-effect rationale.
  const [selected, setSelected] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect -- sync from external store */
  useEffect(() => {
    // Only restore if it matches one of the offered options
    const saved = today.meditationMinutes
    if (saved !== undefined && DURATIONS.includes(saved)) setSelected(saved)
  }, [today.meditationMinutes])
  /* eslint-enable react-hooks/set-state-in-effect */

  const totalSeconds = selected ? selected * 60 : 0
  const progress = totalSeconds > 0 ? elapsed / totalSeconds : 0
  const remaining = Math.max(0, totalSeconds - elapsed)
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0")
  const ss = String(remaining % 60).padStart(2, "0")

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= totalSeconds) {
            setRunning(false)
            clearInterval(intervalRef.current!)
            return totalSeconds
          }
          return prev + 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current!)
    }
    return () => clearInterval(intervalRef.current!)
  }, [running, totalSeconds])

  function handleSkip() {
    updateEntry(entryKey, { meditationMinutes: 0 })
    captureEvent("meditation_skipped")
    onNext()
  }

  function handleDone() {
    if (selected) {
      const completedMinutes = elapsed > 0 ? Math.ceil(elapsed / 60) : selected
      updateEntry(entryKey, { meditationMinutes: completedMinutes })
      captureEvent("meditation_completed", {
        selected_minutes: selected,
        completed_minutes: completedMinutes,
      })
    }
    onNext()
  }

  function startTimer(mins: number) {
    setSelected(mins)
    setElapsed(0)
    setRunning(false)
    captureEvent("meditation_duration_selected", { minutes: mins })
  }

  const circumference = 2 * Math.PI * 52

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight font-semibold text-balance text-foreground lg:text-4xl">
          Want to start with a moment of stillness?
        </h2>
      </div>

      {!selected && (
        <div className="grid grid-cols-3 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => startTimer(d)}
              className="rounded-xl py-3 text-center transition-colors hover:bg-muted/60"
            >
              <span className="block font-[family-name:var(--font-display)] text-2xl font-medium text-foreground">
                {d}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                min
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Timer */}
      {selected && (
        <div className="flex flex-col items-center gap-6">
          {/* Circular progress */}
          <div className="relative flex items-center justify-center">
            <svg
              width="128"
              height="128"
              viewBox="0 0 128 128"
              className="-rotate-90"
            >
              <circle
                cx="64"
                cy="64"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-accent"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-[family-name:var(--font-display)] text-3xl font-medium text-foreground tabular-nums">
                {mm}:{ss}
              </span>
              <span className="text-xs text-muted-foreground">remaining</span>
            </div>
          </div>

          {/* Breathing guide */}
          {running && (
            <motion.div
              animate={shouldReduceMotion ? undefined : { scale: [1, 1.15, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="text-sm text-muted-foreground"
            >
              Breathe gently
            </motion.div>
          )}

          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={() => setRunning((r) => !r)}
              className="h-12 flex-1 rounded-2xl"
            >
              {running ? "Pause" : "Start"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelected(null)
                setElapsed(0)
                setRunning(false)
              }}
              className="h-12 rounded-2xl px-5"
            >
              Reset
            </Button>
          </div>
        </div>
      )}

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
          variant="outline"
          onClick={handleSkip}
          className="h-14 flex-none rounded-2xl px-5"
        >
          Skip
        </Button>
        <Button
          onClick={handleDone}
          className={cn(
            "h-14 flex-1 rounded-2xl text-base font-medium",
            !selected && "opacity-50"
          )}
          disabled={!selected}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
