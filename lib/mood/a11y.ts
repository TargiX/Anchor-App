import type { MoodPoint } from "@/lib/domain/entry"

/**
 * Pure helpers for the 2D mood grid accessibility surface.
 *
 * Kept dependency-free so the same logic is unit-testable under the existing
 * vitest config (lib/glob test pattern) and reusable from server-rendered
 * shells (for example /api snapshots) without pulling React.
 */

const DEFAULT_COARSE_STEP = 0.1
const DEFAULT_FINE_STEP = 0.05
const PAGE_STEP = 0.1

/**
 * Map a key + shift modifier to a normalized step on the valence/energy plane.
 * Returns null for keys that do not move the point (so callers can
 * decide whether to preventDefault / commit / fall through).
 */
export function keyboardStepForKey(
  key: string,
  shiftKey: boolean
): number | null {
  switch (key) {
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
      return shiftKey ? DEFAULT_FINE_STEP : DEFAULT_COARSE_STEP
    case "PageUp":
    case "PageDown":
      return PAGE_STEP
    default:
      return null
  }
}

/**
 * Apply a keyboard event to a 2D mood point. The axis is derived from the key
 * (Left/Right → valence, Up/Down → energy, PageUp/PageDown → both axes
 * simultaneously so users with limited mobility can adjust both ends).
 *
 * Returns a new object — does not mutate `point`.
 */
export function applyKeyboardStep(
  point: MoodPoint,
  key: string,
  shiftKey: boolean
): MoodPoint {
  const step = keyboardStepForKey(key, shiftKey)
  if (step === null) return point

  let { valence, energy } = point
  const clamp = (v: number) => Math.max(0, Math.min(1, v))

  switch (key) {
    case "ArrowRight":
      valence = clamp(valence + step)
      break
    case "ArrowLeft":
      valence = clamp(valence - step)
      break
    case "ArrowUp":
      energy = clamp(energy + step)
      break
    case "ArrowDown":
      energy = clamp(energy - step)
      break
    case "PageUp":
      valence = clamp(valence + step)
      energy = clamp(energy + step)
      break
    case "PageDown":
      valence = clamp(valence - step)
      energy = clamp(energy - step)
      break
    default:
      return point
  }
  return { valence, energy }
}

/**
 * Jump-to-edge shortcuts. `Home` = top-left (high energy, unpleasant),
 * `End` = bottom-right (low energy, pleasant). Returns null for other keys.
 */
export function jumpEdgeForKey(key: string): MoodPoint | null {
  if (key === "Home") return { valence: 0, energy: 1 }
  if (key === "End") return { valence: 1, energy: 0 }
  return null
}

const WORD_BUCKETS: Array<{ test: (v: number, e: number) => boolean; word: string }> = [
  { test: (v, e) => v > 0.75 && e > 0.75, word: "Radiant" },
  { test: (v, e) => v > 0.5 && e > 0.5, word: "Bright" },
  { test: (v, e) => v <= 0.5 && e > 0.75, word: "Wired" },
  { test: (v, e) => v <= 0.5 && e > 0.5, word: "Tense" },
  { test: (v, e) => v > 0.5 && e < 0.25, word: "Serene" },
  { test: (v, e) => v > 0.5 && e <= 0.5, word: "At ease" },
  { test: (v, e) => v <= 0.5 && e < 0.25, word: "Drained" },
  { test: (v) => v <= 0.5, word: "Low" },
]

/**
 * Single source of truth for the mood word shown above the grid and spoken by
 * assistive tech. Imported directly by `components/morning/step-mood.tsx` so
 * screen-reader users hear the same word the sighted user sees.
 */
export function moodWord(valence: number, energy: number): string {
  for (const bucket of WORD_BUCKETS) {
    if (bucket.test(valence, energy)) return bucket.word
  }
  // Unreachable: every (valence, energy) in [0,1]x[0,1] matches at least one
  // bucket. Keep the fallback to satisfy the type checker and to defend
  // against future bucket edits that accidentally leave a gap.
  return "Low"
}

/**
 * Build the spoken value for a composite 2D slider. This is what screen
 * readers announce in place of (or alongside) `aria-valuenow`. Format is:
 *
 *   "<word>. Valence <0-100>, energy <0-100>."
 *
 * The energy dimension is critical — `aria-valuenow` can only carry a single
 * scalar, so without `aria-valuetext` the energy axis is invisible to AT
 * (WCAG 1.3.1 Info and Relationships).
 */
export function ariaValueTextForMood(point: MoodPoint): string {
  const valencePct = Math.round(point.valence * 100)
  const energyPct = Math.round(point.energy * 100)
  const word = moodWord(point.valence, point.energy)
  return `${word}. Valence ${valencePct}, energy ${energyPct}.`
}

/**
 * Spoken description of the keyboard interaction model. Surfaced via
 * `aria-describedby` so screen-reader users know about Shift (fine nudge),
 * PageUp/PageDown (±10% on both axes), Home/End (jump to corners), and the
 * composite value semantics (valence vs. energy).
 */
export const MOOD_GRID_KEYBOARD_HINT =
  "Use arrow keys to nudge, hold Shift for finer steps. " +
  "PageUp and PageDown move both axes. Home jumps to high energy unpleasant; " +
  "End jumps to low energy pleasant."

/**
 * Summary suitable for an `aria-live="polite"` region that mirrors the mood
 * word shown above the grid. Kept terse so it does not spam the AT queue.
 */
export function moodWordForAnnouncement(point: MoodPoint): string {
  return moodWord(point.valence, point.energy)
}