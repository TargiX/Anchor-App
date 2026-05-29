"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateTodayEntry } from "@/lib/store"
import { motion, useReducedMotion } from "framer-motion"
import { Pause, Play } from "lucide-react"
import { useTodayEntry } from "@/hooks/use-store"

const DURATIONS = [2, 5, 10]

interface StepMeditationProps {
  onNext: () => void
  onBack: () => void
}

export function StepMeditation({ onNext, onBack }: StepMeditationProps) {
  const shouldReduceMotion = useReducedMotion()
  const today = useTodayEntry()
  const initialMinutes =
    today.meditationMinutes && today.meditationMinutes > 0
      ? today.meditationMinutes
      : null
  const [selected, setSelected] = useState<number | null>(initialMinutes)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(
    initialMinutes ? initialMinutes * 60 : 0
  )
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    updateTodayEntry({ meditationMinutes: 0 })
    onNext()
  }

  function handleDone() {
    if (selected)
      updateTodayEntry({
        meditationMinutes: elapsed > 0 ? Math.ceil(elapsed / 60) : selected,
      })
    onNext()
  }

  function startTimer(mins: number) {
    setSelected(mins)
    setElapsed(0)
    setRunning(false)
  }

  const circumference = 2 * Math.PI * 52

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Stillness
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-snug font-medium text-balance text-foreground">
          Want to start with a moment of stillness?
        </h2>
      </div>

      {/* Duration picker */}
      {!selected && (
        <div className="flex gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => startTimer(d)}
              aria-label={`Select ${d} minute meditation`}
              className="flex flex-1 flex-col items-center gap-1 rounded-2xl border border-border bg-card py-5 transition-all hover:border-accent hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              <span className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground">
                {d}
              </span>
              <span className="text-xs text-muted-foreground">min</span>
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
                transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
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
              animate={
                shouldReduceMotion ? { opacity: 1 } : { scale: [1, 1.15, 1] }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }
              className="text-sm text-muted-foreground"
            >
              Breathe gently
            </motion.div>
          )}

          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={() => setRunning((r) => !r)}
              aria-pressed={running}
              className="h-12 flex-1 rounded-2xl"
            >
              {running ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
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
          Complete ritual
        </Button>
      </div>
    </div>
  )
}
