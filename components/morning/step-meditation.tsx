"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateTodayEntry } from "@/lib/store/actions"
import { useTodayEntry } from "@/hooks/use-store"
import { motion } from "framer-motion"
import { Pause, Play } from "lucide-react"

const DURATIONS = [2, 5, 10]

interface StepMeditationProps {
  onNext: () => void
  onBack: () => void
}

export function StepMeditation({ onNext, onBack }: StepMeditationProps) {
  const today = useTodayEntry()
  // Restore selected duration if it matches one of the options
  const savedDuration = today?.meditationMinutes && DURATIONS.includes(today.meditationMinutes) ? today.meditationMinutes : null
  const [selected, setSelected] = useState<number | null>(savedDuration)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
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
    if (selected) updateTodayEntry({ meditationMinutes: elapsed > 0 ? Math.ceil(elapsed / 60) : selected })
    onNext()
  }

  function startTimer(mins: number) {
    setSelected(mins)
    setElapsed(0)
    setRunning(false)
  }

  const circumference = 2 * Math.PI * 52

  return (
    <div className="flex flex-col flex-1 gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Stillness
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground text-balance leading-snug">
          Want to start with a moment of stillness?
        </h2>
      </div>

      {/* Duration picker */}
      {!selected && (
        <div className="flex gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => startTimer(d)}
              className="flex-1 flex flex-col items-center gap-1 py-5 rounded-2xl border border-border bg-card hover:border-accent hover:bg-accent/5 transition-all"
            >
              <span className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground">{d}</span>
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
            <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
              <circle cx="64" cy="64" r="52" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
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
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="text-sm text-muted-foreground"
            >
              Breathe gently
            </motion.div>
          )}

          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setRunning((r) => !r)}
              className="flex-1 rounded-2xl h-12"
            >
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? "Pause" : "Start"}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setSelected(null); setElapsed(0); setRunning(false) }}
              className="rounded-2xl h-12 px-5"
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="mt-auto pb-10 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-none rounded-2xl h-14 px-6">
          Back
        </Button>
        <Button
          variant="outline"
          onClick={handleSkip}
          className="flex-none rounded-2xl h-14 px-5"
        >
          Skip
        </Button>
        <Button
          onClick={handleDone}
          className={cn("flex-1 rounded-2xl h-14 text-base font-medium", !selected && "opacity-50")}
          disabled={!selected}
        >
          Complete ritual
        </Button>
      </div>
    </div>
  )
}
