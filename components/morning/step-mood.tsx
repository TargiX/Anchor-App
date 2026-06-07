"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { updateTodayEntry, type MoodPoint } from "@/lib/store"

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

export function StepMood({ onNext, onBack, isMorning = true }: StepMoodProps) {
  const [point, setPoint] = useState<MoodPoint | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  function handleGridInteraction(e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) {
    const el = gridRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    let clientX: number, clientY: number

    if ("touches" in e) {
      const touch = e.touches[0]
      if (!touch) return
      clientX = touch.clientX
      clientY = touch.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const valence = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const energy = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height))
    setPoint({ valence, energy })
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
    <div className="flex flex-col flex-1 gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Mood
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground text-balance leading-snug">
          Where are you right now?
        </h2>
        <p className="text-sm text-muted-foreground">
          Tap the grid to place yourself in this moment.
        </p>
      </div>

      {/* 2D Mood grid */}
      <div className="relative">
        {/* Axis labels */}
        <div className="flex justify-center mb-2">
          <span className="text-xs text-muted-foreground font-medium tracking-wide">High energy</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground -rotate-90 whitespace-nowrap font-medium tracking-wide w-4">Unpleasant</span>

          <div
            ref={gridRef}
            className="flex-1 aspect-square rounded-3xl border border-border bg-card relative cursor-crosshair select-none overflow-hidden"
            onClick={handleGridInteraction}
            onTouchMove={(e) => { e.preventDefault(); handleGridInteraction(e) }}
            onTouchStart={handleGridInteraction}
            role="button"
            aria-label="Mood grid — tap to place your mood"
          >
            {/* Subtle quadrant shading */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-[0.07]">
              <div className="bg-amber-500" />
              <div className="bg-emerald-500" />
              <div className="bg-blue-500" />
              <div className="bg-violet-500" />
            </div>

            {/* Axis lines */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-px bg-border" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-full w-px bg-border" />
            </div>

            {/* Corner labels */}
            {Object.entries(MOOD_LABELS).map(([key, val]) => (
              <span
                key={key}
                className="absolute text-[10px] text-muted-foreground/60 font-medium whitespace-pre-line leading-tight text-center w-16"
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
                className="absolute size-5 rounded-full bg-accent border-2 border-background shadow-lg pointer-events-none"
                style={{
                  left: `${point.valence * 100}%`,
                  top: `${(1 - point.energy) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
          </div>

          <span className="text-xs text-muted-foreground rotate-90 whitespace-nowrap font-medium tracking-wide w-4">Pleasant</span>
        </div>
        <div className="flex justify-center mt-2">
          <span className="text-xs text-muted-foreground font-medium tracking-wide">Low energy</span>
        </div>
      </div>

      {/* Nav */}
      <div className="mt-auto pb-10 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-none rounded-2xl h-14 px-6">
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!point}
          className="flex-1 rounded-2xl h-14 text-base font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
