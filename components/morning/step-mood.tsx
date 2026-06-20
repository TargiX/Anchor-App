"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { updateTodayEntry } from "@/lib/store/actions"
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

/**
 * Maps a point on the valence (x) / energy (y) grid to a soft,
 * warm colour. We blend across the four quadrant hues so the whole
 * canvas feels like it shifts mood as you move — a quiet, ambient cue.
 *
 * Returns RGB values on a 0–255 scale.
 */
function moodColor(valence: number, energy: number): { r: number; g: number; b: number } {
  // Quadrant hues (RGB), tuned to sit inside Anchor's warm palette.
  const depleted = [99, 130, 180] // low / low — hazy blue
  const tense = [200, 130, 90] // high energy / low valence — warm clay
  const calm = [120, 165, 130] // low energy / high valence — sage
  const joyful = [225, 165, 95] // high / high — ember gold

  const bl = (1 - valence) * (1 - energy)
  const tl = (1 - valence) * energy
  const br = valence * (1 - energy)
  const tr = valence * energy

  const r = depleted[0] * bl + tense[0] * tl + calm[0] * br + joyful[0] * tr
  const g = depleted[1] * bl + tense[1] * tl + calm[1] * br + joyful[1] * tr
  const b = depleted[2] * bl + tense[2] * tl + calm[2] * br + joyful[2] * tr

  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) }
}

/** A short, human word for where the point sits — shown as ambient feedback. */
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
  const [point, setPoint] = useState<MoodPoint | null>(null)
  const [dragging, setDragging] = useState(false)
  const [ripple, setRipple] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)

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
    // First placement — show a ripple.
    setRipple((n) => n + 1)
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

  // Keyboard nudging for accessibility — fine-grained control without a mouse.
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
      setRipple((n) => n + 1)
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
  const color = useMemo(() => {
    if (!point) return null
    return moodColor(point.valence, point.energy)
  }, [point])

  const word = useMemo(() => {
    if (!point) return null
    return moodWord(point.valence, point.energy)
  }, [point])

  // Subtle background tint over the whole card, driven by the point — the
  // "environment around the cube" the ritual asked for.
  const bgTint = useMemo(() => {
    if (!color) return "transparent"
    return `radial-gradient(circle at ${point!.valence * 100}% ${(1 - point!.energy) * 100}%, rgba(${color.r}, ${color.g}, ${color.b}, 0.28), transparent 62%)`
  }, [color, point])

  // Position for the dot's outer wrapper (keeps it pinned while the
  // inner element can drift/pulse independently). We smooth the transition
  // on taps and keyboard nudges, but follow instantly while dragging.
  const pointPos = useMemo(() => {
    if (!point) return undefined
    return {
      left: `${point.valence * 100}%`,
      top: `${(1 - point.energy) * 100}%`,
      transition: dragging ? "none" : "left 0.25s ease-out, top 0.25s ease-out",
    } as React.CSSProperties
  }, [point, dragging])

  const pointStyle = useMemo(() => {
    if (!color) return undefined
    return {
      backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
      boxShadow: `0 0 0 6px rgba(${color.r}, ${color.g}, ${color.b}, 0.18), 0 8px 24px rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`,
    } as React.CSSProperties
  }, [color])

  const haloStyle = useMemo(() => {
    if (!point || !color) return undefined
    return {
      left: `${point.valence * 100}%`,
      top: `${(1 - point.energy) * 100}%`,
      background: `radial-gradient(circle, rgba(${color.r}, ${color.g}, ${color.b}, 0.55), rgba(${color.r}, ${color.g}, ${color.b}, 0) 70%)`,
      transition: dragging ? "none" : "left 0.25s ease-out, top 0.25s ease-out",
    } as React.CSSProperties
  }, [point, color, dragging])

  // Make the grid itself feel alive: a faint tilt toward the point, like
  // the field leaning into where you are.
  const fieldTilt = useMemo(() => {
    if (!point) return { rx: 0, ry: 0 }
    const dx = point.valence - 0.5
    const dy = 0.5 - point.energy
    return { rx: dy * 5, ry: dx * 5 }
  }, [point])

  // Pause the halo pulse when dragging, so it feels responsive, not laggy.
  const haloAnimation = dragging ? "none" : "mood-halo-pulse 4.5s ease-in-out infinite"

  // Cleanup is a no-op but keeps the capture contract tidy.
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
        {/* Ambient mood word, fading in as you move */}
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
            style={{ perspective: "600px" }}
          >
            {/* Living tinted background */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-500"
              style={{ background: bgTint, opacity: point ? 1 : 0 }}
            />

            {/* Field that tilts toward the point */}
            <div
              className="absolute inset-0 transition-transform duration-300 ease-out"
              style={{
                transform: `rotateX(${fieldTilt.rx}deg) rotateY(${fieldTilt.ry}deg)`,
                transformStyle: "preserve-3d",
              }}
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
            </div>

            {/* Ripple on placement */}
            {point && ripple > 0 && pointStyle && (
              <span
                key={ripple}
                className="absolute size-5 rounded-full pointer-events-none"
                style={{
                  ...pointPos,
                  ...pointStyle,
                  transform: "translate(-50%, -50%) scale(0.2)",
                  animation: "mood-ripple 0.6s ease-out forwards",
                }}
              />
            )}

            {/* Halo that follows the point */}
            {point && haloStyle && (
              <div
                className="absolute size-28 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  ...haloStyle,
                  animation: haloAnimation,
                  ["--halo-opacity" as string]: dragging ? 0.7 : 0.55,
                }}
              />
            )}

            {/* The dot itself — wrapper pins position, inner drifts */}
            {point && pointStyle && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={pointPos}
              >
                <div
                  className="size-5 rounded-full border-2 border-background"
                  style={{
                    ...pointStyle,
                    animation: "mood-dot-enter 0.4s ease-out, mood-drift 5s ease-in-out 0.4s infinite",
                  }}
                />
              </div>
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
