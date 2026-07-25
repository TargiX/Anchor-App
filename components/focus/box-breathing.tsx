"use client"

import { useEffect, useReducer, useState } from "react"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PHASES = [
  { label: "Inhale", cue: "Let the breath arrive.", scale: "scale-100" },
  { label: "Hold", cue: "Stay with the stillness.", scale: "scale-100" },
  { label: "Exhale", cue: "Let the day soften.", scale: "scale-75" },
  { label: "Hold", cue: "Make a little room.", scale: "scale-75" },
] as const

const SECONDS_PER_PHASE = 4

type BreathingState = {
  phaseIndex: number
  secondsRemaining: number
  completedCycles: number
}

const initialBreathingState: BreathingState = {
  phaseIndex: 0,
  secondsRemaining: SECONDS_PER_PHASE,
  completedCycles: 0,
}

function advanceBreathing(state: BreathingState): BreathingState {
  if (state.secondsRemaining > 1) {
    return { ...state, secondsRemaining: state.secondsRemaining - 1 }
  }

  const phaseIndex = (state.phaseIndex + 1) % PHASES.length

  return {
    phaseIndex,
    secondsRemaining: SECONDS_PER_PHASE,
    completedCycles: state.completedCycles + (phaseIndex === 0 ? 1 : 0),
  }
}

export function BoxBreathing() {
  const [isRunning, setIsRunning] = useState(false)
  const [breathing, advance] = useReducer(advanceBreathing, initialBreathingState)
  const phase = PHASES[breathing.phaseIndex]!

  useEffect(() => {
    if (!isRunning) return

    const timer = window.setInterval(() => {
      advance()
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isRunning])

  return (
    <section className="flex flex-1 flex-col justify-center pb-8" aria-labelledby="box-breathing-title">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center rounded-[2rem] border border-border bg-card px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Box breathing
        </p>
        <h2
          id="box-breathing-title"
          className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium text-foreground sm:text-4xl"
        >
          Four steady sides.
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          Follow the shape: inhale, hold, exhale, hold. Each side lasts four counts.
        </p>

        <div className="mt-10 flex h-52 w-52 items-center justify-center rounded-full border border-primary/20 bg-primary/5 sm:h-60 sm:w-60">
          <div
            className={cn(
              "flex h-40 w-40 items-center justify-center rounded-full bg-primary/10 transition-transform duration-1000 ease-in-out motion-reduce:transition-none sm:h-48 sm:w-48",
              phase.scale
            )}
          >
            <AnchorMotif size={112} className="text-primary opacity-80 sm:size-32" />
          </div>
        </div>

        <div className="mt-9 min-h-20" role="status" aria-live="polite" aria-atomic="true">
          <p className="font-[family-name:var(--font-display)] text-3xl font-medium text-foreground">
            {phase.label}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {breathing.secondsRemaining} {breathing.secondsRemaining === 1 ? "second" : "seconds"} · {phase.cue}
          </p>
        </div>

        <Button
          className="mt-7 min-w-40 rounded-2xl px-8"
          size="lg"
          onClick={() => setIsRunning((running) => !running)}
          aria-pressed={isRunning}
        >
          {isRunning ? "Pause" : "Start breathing"}
        </Button>
        <p className="mt-5 text-xs text-muted-foreground">
          {breathing.completedCycles === 0
            ? "Your first cycle begins when you are ready."
            : `${breathing.completedCycles} ${breathing.completedCycles === 1 ? "cycle" : "cycles"} completed.`}
        </p>
      </div>
    </section>
  )
}
