"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { updateTodayEntry } from "@/lib/store"
import { type MoodPoint } from "@/lib/domain/entry"
import { useTodayEntry } from "@/hooks/use-store"

interface StepMoodProps {
  onNext: () => void
  onBack: () => void
  isMorning?: boolean
}

const MOOD_LABELS = {
  topLeft: { label: "Alert\n& Tense", x: 0.15, y: 0.15 },
  topRight: { label: "Energized\n& Joyful", x: 0.85, y: 0.15 },
  bottomLeft: { label: "Depleted\n& Low", x: 0.15, y: 0.85 },
  bottomRight: { label: "Calm\n& Content", x: 0.85, y: 0.85 },
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function StepMood({ onNext, onBack, isMorning = true }: StepMoodProps) {
  const today = useTodayEntry()
  const [point, setPoint] = useState<MoodPoint | null>(
    () => (isMorning ? today.morningMood : today.eveningMood) ?? null
  )
  const gridRef = useRef<HTMLDivElement>(null)

  function handleGridInteraction(
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) {
    const el = gridRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    let clientX: number, clientY: number

    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const valence = clamp((clientX - rect.left) / rect.width)
    const energy = clamp(1 - (clientY - rect.top) / rect.height)
    setPoint({ valence, energy })
  }

  function handleGridKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 0.1 : 0.05
    const current = point ?? { valence: 0.5, energy: 0.5 }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setPoint(current)
      return
    }

    const next =
      e.key === "ArrowLeft"
        ? { ...current, valence: clamp(current.valence - step) }
        : e.key === "ArrowRight"
          ? { ...current, valence: clamp(current.valence + step) }
          : e.key === "ArrowUp"
            ? { ...current, energy: clamp(current.energy + step) }
            : e.key === "ArrowDown"
              ? { ...current, energy: clamp(current.energy - step) }
              : null

    if (!next) return
    e.preventDefault()
    setPoint(next)
  }

  function handleNext() {
    if (!point) return
    if (isMorning) {
      updateTodayEntry({ morningMood: point })
    } else {
      updateTodayEntry({ eveningMood: point })
    }
    onNext()
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Mood
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl leading-snug font-medium text-balance text-foreground">
          Where are you right now?
        </h2>
        <p className="text-sm text-muted-foreground">
          Tap the grid to place yourself in this moment.
        </p>
      </div>

      {/* 2D Mood grid */}
      <div className="relative">
        {/* Axis labels */}
        <div className="mb-2 flex justify-center">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            High energy
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-4 -rotate-90 text-xs font-medium tracking-wide whitespace-nowrap text-muted-foreground">
            Unpleasant
          </span>

          <div
            ref={gridRef}
            className="relative aspect-square flex-1 cursor-crosshair overflow-hidden rounded-3xl border border-border bg-card select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            onClick={handleGridInteraction}
            onTouchMove={(e) => {
              e.preventDefault()
              handleGridInteraction(e)
            }}
            onTouchStart={handleGridInteraction}
            onKeyDown={handleGridKeyDown}
            role="button"
            tabIndex={0}
            aria-pressed={!!point}
            aria-label="Mood grid. Tap, click, or use arrow keys to place your mood."
          >
            {/* Subtle quadrant shading */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-[0.07]">
              <div className="bg-amber-500" />
              <div className="bg-emerald-500" />
              <div className="bg-blue-500" />
              <div className="bg-violet-500" />
            </div>

            {/* Axis lines */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-px w-full bg-border" />
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-border" />
            </div>

            {/* Corner labels */}
            {Object.entries(MOOD_LABELS).map(([key, val]) => (
              <span
                key={key}
                className="absolute w-16 text-center text-[10px] leading-tight font-medium whitespace-pre-line text-muted-foreground/60"
                style={{
                  left: `${val.x * 100}%`,
                  top: `${val.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {val.label}
              </span>
            ))}

            {/* Selected point */}
            {point && (
              <div
                className="pointer-events-none absolute size-5 rounded-full border-2 border-background bg-accent shadow-lg"
                style={{
                  left: `${point.valence * 100}%`,
                  top: `${(1 - point.energy) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
          </div>

          <span className="w-4 rotate-90 text-xs font-medium tracking-wide whitespace-nowrap text-muted-foreground">
            Pleasant
          </span>
        </div>
        <div className="mt-2 flex justify-center">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            Low energy
          </span>
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
          disabled={!point}
          className="h-14 flex-1 rounded-2xl text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
