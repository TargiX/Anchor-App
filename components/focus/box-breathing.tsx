"use client"

import { useEffect, useReducer, useState } from "react"
import { useRouter } from "next/navigation"
import { AnchorMotif } from "@/components/anchor-motif"
import { Button } from "@/components/ui/button"
import { takeFocusResetContextFrom } from "@/lib/focus/reset-context"
import { cn } from "@/lib/utils"

const PHASES = [
  { label: "Inhale", cue: "Let the breath arrive.", scale: "scale-100" },
  { label: "Hold", cue: "Stay with the stillness.", scale: "scale-100" },
  { label: "Exhale", cue: "Let the day soften.", scale: "scale-75" },
  { label: "Hold", cue: "Make a little room.", scale: "scale-75" },
] as const

const SECONDS_PER_PHASE = 4

const RESET_LENGTHS = [
  { cycles: 2, label: "2 rounds", duration: "32 sec" },
  { cycles: 4, label: "4 rounds", duration: "about 1 min" },
  { cycles: 6, label: "6 rounds", duration: "96 sec" },
] as const

type BreathingState = {
  phaseIndex: number
  secondsRemaining: number
  completedCycles: number
  isRunning: boolean
}

const initialBreathingState: BreathingState = {
  phaseIndex: 0,
  secondsRemaining: SECONDS_PER_PHASE,
  completedCycles: 0,
  isRunning: false,
}

type BreathingAction =
  | { type: "advance"; targetCycles: number }
  | { type: "reset" }
  | { type: "start"; targetCycles: number }
  | { type: "pause" }

function breathingReducer(
  state: BreathingState,
  action: BreathingAction
): BreathingState {
  if (action.type === "reset") return initialBreathingState
  if (action.type === "pause") return { ...state, isRunning: false }
  if (action.type === "start") {
    return state.completedCycles >= action.targetCycles
      ? { ...initialBreathingState, isRunning: true }
      : { ...state, isRunning: true }
  }

  if (state.secondsRemaining > 1) {
    return { ...state, secondsRemaining: state.secondsRemaining - 1 }
  }

  const phaseIndex = (state.phaseIndex + 1) % PHASES.length
  const completedCycles = state.completedCycles + (phaseIndex === 0 ? 1 : 0)

  return {
    phaseIndex,
    secondsRemaining: SECONDS_PER_PHASE,
    completedCycles,
    isRunning: completedCycles < action.targetCycles,
  }
}

export function BoxBreathing() {
  const router = useRouter()
  const [targetCycles, setTargetCycles] = useState(4)
  const [resetContext] = useState(() =>
    typeof window === "undefined" ? null : takeFocusResetContextFrom(() => window.sessionStorage)
  )
  const [breathing, dispatch] = useReducer(breathingReducer, initialBreathingState)
  const phase = PHASES[breathing.phaseIndex]!
  const selectedLength = RESET_LENGTHS.find(
    (length) => length.cycles === targetCycles
  )!
  const isComplete = breathing.completedCycles >= targetCycles

  useEffect(() => {
    if (!breathing.isRunning) return

    const timer = window.setInterval(() => {
      dispatch({ type: "advance", targetCycles })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [breathing.isRunning, targetCycles])

  function selectLength(cycles: number) {
    setTargetCycles(cycles)
    dispatch({ type: "reset" })
  }

  function toggleBreathing() {
    if (breathing.isRunning) {
      dispatch({ type: "pause" })
      return
    }

    dispatch({ type: "start", targetCycles })
  }

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
          Choose a small container, then follow the shape: inhale, hold, exhale, hold. Each side lasts four counts.
        </p>

        <div className="mt-7 w-full" aria-label="Focus reset length">
          <p className="mb-3 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Reset length
          </p>
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted/45 p-1">
            {RESET_LENGTHS.map((length) => {
              const isSelected = length.cycles === targetCycles
              return (
                <button
                  key={length.cycles}
                  type="button"
                  onClick={() => selectLength(length.cycles)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-xl px-2 py-2 text-center text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="block">{length.label}</span>
                  <span className="mt-0.5 block text-[11px] opacity-70">{length.duration}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-8 flex h-52 w-52 items-center justify-center rounded-full border border-primary/20 bg-primary/5 sm:h-60 sm:w-60">
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
          onClick={toggleBreathing}
          aria-pressed={breathing.isRunning}
        >
          {breathing.isRunning
            ? "Pause"
            : isComplete
              ? "Begin again"
              : `Start ${selectedLength.label.toLowerCase()} reset`}
        </Button>
        {isComplete ? (
          <section
            className="mt-5 w-full rounded-2xl border border-accent/30 bg-accent/5 px-4 py-4"
            aria-label="Reset complete"
          >
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Ready to return
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {resetContext
                ? `Your next small step: ${resetContext.nextStep}.`
                : "You made space. Take your next smallest step."}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full rounded-xl"
              onClick={() => router.push("/app")}
            >
              Return to today
            </Button>
          </section>
        ) : (
          <p className="mt-5 text-xs text-muted-foreground">
            {breathing.completedCycles === 0
              ? `Your ${selectedLength.label.toLowerCase()} reset begins when you are ready.`
              : `${breathing.completedCycles} ${breathing.completedCycles === 1 ? "round" : "rounds"} completed.`}
          </p>
        )}
      </div>
    </section>
  )
}
