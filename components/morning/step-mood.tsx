"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { updateTodayEntry } from "@/lib/store/actions"
import { useTodayEntry } from "@/hooks/use-store"
import { type MoodPoint } from "@/lib/domain/entry"

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

// Quadrant base colors (RGBA) - soft, quiet starting points
const QUADRANT_COLORS = {
  topLeft: [99, 130, 180],    // low/low — hazy blue
  topRight: [255, 195, 80],  // high/high — sunny gold/yellow
  bottomLeft: [140, 110, 140], // high energy/low valence — muted plum
  bottomRight: [120, 165, 130], // low energy/high valence — sage
} as const

// Corner points for each quadrant (0-1 scale) — max saturation at corners
const QUADRANT_CORNERS = {
  topLeft: { x: 0, y: 0 },      // high energy, unpleasant
  topRight: { x: 1, y: 0 },     // high energy, pleasant
  bottomLeft: { x: 0, y: 1 },   // low energy, unpleasant
  bottomRight: { x: 1, y: 1 },  // low energy, pleasant
} as const

/**
 * Calculate saturation boost for a quadrant based on distance to its corner.
 * Center (0.5, 0.5) = 0 boost, corner = 1 boost. Max distance ~0.707
 * (corner-to-center), normalized to 0-1.
 */
function quadrantBoost(
  pointX: number,
  pointY: number,
  corner: { x: number; y: number }
): number {
  const dx = pointX - corner.x
  const dy = pointY - corner.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return Math.max(0, 1 - distance / 0.71)
}

/**
 * Per-quadrant saturation boosts (0 at center, 1 at corner) for a mood point.
 * Energy is flipped because grid Y is inverted relative to the data Y axis.
 * Shared by quadrantStyles and pointColor to keep them in sync.
 */
function quadrantBoosts(point: MoodPoint) {
  const px = point.valence
  const py = 1 - point.energy
  return {
    topLeft: quadrantBoost(px, py, QUADRANT_CORNERS.topLeft),
    topRight: quadrantBoost(px, py, QUADRANT_CORNERS.topRight),
    bottomLeft: quadrantBoost(px, py, QUADRANT_CORNERS.bottomLeft),
    bottomRight: quadrantBoost(px, py, QUADRANT_CORNERS.bottomRight),
  }
}

/** A short, human word for where the point sits. */
function moodWord(valence: number, energy: number): string {
  if (valence > 0.5 && energy > 0.5) {
    if (valence > 0.75 && energy > 0.75) return "Radiant"
    return "Bright"
  }
  if (valence <= 0.5 && energy > 0.5) {
    return energy > 0.75 ? "Wired" : "Tense"
  }
  if (valence > 0.5 && energy <= 0.5) {
    return energy < 0.25 ? "Serene" : "At ease"
  }
  return energy < 0.25 ? "Drained" : "Low"
}

export function StepMood({ onNext, onBack, isMorning = true }: StepMoodProps) {
  const today = useTodayEntry()
  // Default to grid center; effect syncs the hydrated mood point after
  // useAppState finishes loading from storage. See step-sleep for the
  // set-state-in-effect rationale.
  const [point, setPoint] = useState<MoodPoint | null>({ valence: 0.5, energy: 0.5 })
  const [dragging, setDragging] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  /* eslint-disable react-hooks/set-state-in-effect -- sync from external store */
  useEffect(() => {
    const saved = isMorning ? today?.morningMood : today?.eveningMood
    if (saved) setPoint(saved)
  }, [today?.morningMood, today?.eveningMood, isMorning])
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateFromEvent = useCallback((clientX: number, clientY: number) => {
    const el = gridRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const valence = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const energy = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height))
    setPoint({ valence, energy })
  }, [])

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    updateFromEvent(e.clientX, e.clientY)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    updateFromEvent(e.clientX, e.clientY)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* pointer already released */
    }
    setDragging(false)
  }

  // Keyboard nudging for accessibility.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 0.05 : 0.1
    const cur = point ?? { valence: 0.5, energy: 0.5 }
    let { valence, energy } = cur
    let used = true
    switch (e.key) {
      case "ArrowRight":
        valence = Math.min(1, valence + step)
        break
      case "ArrowLeft":
        valence = Math.max(0, valence - step)
        break
      case "ArrowUp":
        energy = Math.min(1, energy + step)
        break
      case "ArrowDown":
        energy = Math.max(0, energy - step)
        break
      default:
        used = false
    }
    if (used) {
      e.preventDefault()
      setPoint({ valence, energy })
    }
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

  // Derived ambient values.
  const word = useMemo(() => {
    if (!point) return null
    return moodWord(point.valence, point.energy)
  }, [point])

  // Calculate quadrant saturation boosts.
  const quadrantStyles = useMemo(() => {
    if (!point) return null

    const boosts = quadrantBoosts(point)

    // Base opacity is 0.06, max is 0.18 for subtle, breathing presence
    return {
      topLeft: {
        backgroundColor: `rgba(${QUADRANT_COLORS.topLeft.join(",")}, ${0.06 + boosts.topLeft * 0.12})`,
        transition: dragging ? "none" : "background-color 0.4s ease-out",
      },
      topRight: {
        backgroundColor: `rgba(${QUADRANT_COLORS.topRight.join(",")}, ${0.06 + boosts.topRight * 0.12})`,
        transition: dragging ? "none" : "background-color 0.4s ease-out",
      },
      bottomLeft: {
        backgroundColor: `rgba(${QUADRANT_COLORS.bottomLeft.join(",")}, ${0.06 + boosts.bottomLeft * 0.12})`,
        transition: dragging ? "none" : "background-color 0.4s ease-out",
      },
      bottomRight: {
        backgroundColor: `rgba(${QUADRANT_COLORS.bottomRight.join(",")}, ${0.06 + boosts.bottomRight * 0.12})`,
        transition: dragging ? "none" : "background-color 0.4s ease-out",
      },
    }
  }, [point, dragging])

  // Point color — blend of boosted quadrants for the dot itself.
  const pointColor = useMemo(() => {
    if (!point) return null

    const boosts = quadrantBoosts(point)

    // Weighted blend of all quadrants
    const totalWeight = boosts.topLeft + boosts.topRight + boosts.bottomLeft + boosts.bottomRight || 1

    const r = (QUADRANT_COLORS.topLeft[0] * boosts.topLeft +
               QUADRANT_COLORS.topRight[0] * boosts.topRight +
               QUADRANT_COLORS.bottomLeft[0] * boosts.bottomLeft +
               QUADRANT_COLORS.bottomRight[0] * boosts.bottomRight) / totalWeight

    const g = (QUADRANT_COLORS.topLeft[1] * boosts.topLeft +
               QUADRANT_COLORS.topRight[1] * boosts.topRight +
               QUADRANT_COLORS.bottomLeft[1] * boosts.bottomLeft +
               QUADRANT_COLORS.bottomRight[1] * boosts.bottomRight) / totalWeight

    const b = (QUADRANT_COLORS.topLeft[2] * boosts.topLeft +
               QUADRANT_COLORS.topRight[2] * boosts.topRight +
               QUADRANT_COLORS.bottomLeft[2] * boosts.bottomLeft +
               QUADRANT_COLORS.bottomRight[2] * boosts.bottomRight) / totalWeight

    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) }
  }, [point])

  const pointPos = useMemo(() => {
    if (!point) return undefined
    return {
      left: `${point.valence * 100}%`,
      top: `${(1 - point.energy) * 100}%`,
      transition: dragging ? "none" : "left 0.25s ease-out, top 0.25s ease-out",
    } as React.CSSProperties
  }, [point, dragging])

  const pointStyle = useMemo(() => {
    if (!pointColor) return undefined
    return {
      backgroundColor: `rgb(${pointColor.r}, ${pointColor.g}, ${pointColor.b})`,
      boxShadow: `0 0 0 4px rgba(${pointColor.r}, ${pointColor.g}, ${pointColor.b}, 0.15), 0 4px 12px rgba(${pointColor.r}, ${pointColor.g}, ${pointColor.b}, 0.25)`,
      transition: dragging ? "none" : "background-color 0.4s ease-out, box-shadow 0.4s ease-out",
    } as React.CSSProperties
  }, [pointColor, dragging])

  useEffect(() => {
    return () => setDragging(false)
  }, [])

  return (
    <div className="flex flex-col flex-1 gap-8">
      <div className="flex flex-col gap-2 pt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Mood</p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-foreground text-balance leading-snug">
          Where are you right now?
        </h2>
        <p className="text-sm text-muted-foreground">
          {point ? "Drag to fine-tune — or tap anywhere." : "Drag or tap to place yourself in this moment."}
        </p>
      </div>

      {/* 2D Mood grid */}
      <div className="relative">
        {/* Ambient mood word */}
        <div className="flex justify-center mb-2 h-5">
          {word && (
            <span
              key={word}
              className="text-xs font-[family-name:var(--font-display)] tracking-wide text-muted-foreground"
              style={{ animation: "mood-word-enter 0.35s ease-out" }}
            >
              {word}
            </span>
          )}
        </div>

        <div className="flex justify-center mb-2">
          <span className="text-xs text-muted-foreground font-medium tracking-wide">High energy</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground -rotate-90 whitespace-nowrap font-medium tracking-wide w-4">
            Unpleasant
          </span>

          <div
            ref={gridRef}
            className="flex-1 aspect-square rounded-3xl border border-border bg-card relative cursor-grab active:cursor-grabbing select-none overflow-hidden touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={handleKeyDown}
            role="slider"
            tabIndex={0}
            aria-label="Mood grid — drag or tap to place your mood, arrow keys to nudge"
            aria-valuenow={point ? Math.round(point.valence * 100) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {/* Quadrant grid — each breathes with saturation */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div
                className="transition-all duration-400 ease-out"
                style={quadrantStyles?.topLeft ?? { backgroundColor: "rgba(99, 130, 180, 0.06)" }}
              />
              <div
                className="transition-all duration-400 ease-out"
                style={quadrantStyles?.topRight ?? { backgroundColor: "rgba(255, 195, 80, 0.06)" }}
              />
              <div
                className="transition-all duration-400 ease-out"
                style={quadrantStyles?.bottomLeft ?? { backgroundColor: "rgba(140, 110, 140, 0.06)" }}
              />
              <div
                className="transition-all duration-400 ease-out"
                style={quadrantStyles?.bottomRight ?? { backgroundColor: "rgba(120, 165, 130, 0.06)" }}
              />
            </div>

            {/* Axis lines */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-px bg-border/60" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-full w-px bg-border/60" />
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

            {/* The mood dot */}
            {point && pointStyle && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none size-5 rounded-full border-2 border-background"
                style={{
                  ...pointPos,
                  ...pointStyle,
                  animation: "mood-dot-enter 0.5s ease-out, mood-drift 4s ease-in-out 0.5s infinite",
                }}
              />
            )}
          </div>

          <span className="text-xs text-muted-foreground rotate-90 whitespace-nowrap font-medium tracking-wide w-4">
            Pleasant
          </span>
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
