import { describe, it, expect } from "vitest"
import {
  applyKeyboardStep,
  ariaValueTextForMood,
  jumpEdgeForKey,
  keyboardStepForKey,
  moodWord,
  moodWordForAnnouncement,
  MOOD_GRID_KEYBOARD_HINT,
} from "./a11y"
import type { MoodPoint } from "@/lib/domain/entry"

describe("keyboardStepForKey", () => {
  it("returns coarse step for arrows without Shift", () => {
    expect(keyboardStepForKey("ArrowRight", false)).toBe(0.1)
    expect(keyboardStepForKey("ArrowLeft", false)).toBe(0.1)
    expect(keyboardStepForKey("ArrowUp", false)).toBe(0.1)
    expect(keyboardStepForKey("ArrowDown", false)).toBe(0.1)
  })

  it("returns fine step for arrows with Shift", () => {
    expect(keyboardStepForKey("ArrowRight", true)).toBe(0.05)
    expect(keyboardStepForKey("ArrowUp", true)).toBe(0.05)
  })

  it("returns page step for PageUp/PageDown regardless of Shift", () => {
    expect(keyboardStepForKey("PageUp", false)).toBe(0.1)
    expect(keyboardStepForKey("PageUp", true)).toBe(0.1)
    expect(keyboardStepForKey("PageDown", false)).toBe(0.1)
  })

  it("returns null for non-handled keys", () => {
    expect(keyboardStepForKey("Enter", false)).toBeNull()
    expect(keyboardStepForKey(" ", false)).toBeNull()
    expect(keyboardStepForKey("Escape", false)).toBeNull()
  })
})

describe("applyKeyboardStep", () => {
  const center: MoodPoint = { valence: 0.5, energy: 0.5 }

  it("moves valence right with ArrowRight", () => {
    expect(applyKeyboardStep(center, "ArrowRight", false)).toEqual({
      valence: 0.6,
      energy: 0.5,
    })
  })

  it("moves valence left with ArrowLeft", () => {
    expect(applyKeyboardStep(center, "ArrowLeft", false)).toEqual({
      valence: 0.4,
      energy: 0.5,
    })
  })

  it("moves energy up with ArrowUp", () => {
    expect(applyKeyboardStep(center, "ArrowUp", false)).toEqual({
      valence: 0.5,
      energy: 0.6,
    })
  })

  it("moves energy down with ArrowDown", () => {
    expect(applyKeyboardStep(center, "ArrowDown", false)).toEqual({
      valence: 0.5,
      energy: 0.4,
    })
  })

  it("uses fine step with Shift", () => {
    expect(applyKeyboardStep(center, "ArrowRight", true)).toEqual({
      valence: 0.55,
      energy: 0.5,
    })
  })

  it("PageUp increases both axes simultaneously", () => {
    expect(applyKeyboardStep(center, "PageUp", false)).toEqual({
      valence: 0.6,
      energy: 0.6,
    })
  })

  it("PageDown decreases both axes simultaneously", () => {
    expect(applyKeyboardStep(center, "PageDown", false)).toEqual({
      valence: 0.4,
      energy: 0.4,
    })
  })

  it("clamps valence at 1", () => {
    const high: MoodPoint = { valence: 0.95, energy: 0.5 }
    expect(applyKeyboardStep(high, "ArrowRight", false)).toEqual({
      valence: 1,
      energy: 0.5,
    })
  })

  it("clamps valence at 0", () => {
    const low: MoodPoint = { valence: 0.05, energy: 0.5 }
    expect(applyKeyboardStep(low, "ArrowLeft", false)).toEqual({
      valence: 0,
      energy: 0.5,
    })
  })

  it("clamps energy at extremes with PageUp", () => {
    const high: MoodPoint = { valence: 0.95, energy: 0.95 }
    expect(applyKeyboardStep(high, "PageUp", false)).toEqual({
      valence: 1,
      energy: 1,
    })
  })

  it("returns the original point for non-handled keys", () => {
    const next = applyKeyboardStep(center, "Enter", false)
    expect(next).toBe(center)
  })

  it("does not mutate the input point", () => {
    const input: MoodPoint = { valence: 0.5, energy: 0.5 }
    applyKeyboardStep(input, "ArrowRight", false)
    expect(input).toEqual({ valence: 0.5, energy: 0.5 })
  })
})

describe("jumpEdgeForKey", () => {
  it("Home jumps to top-left (high energy, unpleasant)", () => {
    expect(jumpEdgeForKey("Home")).toEqual({ valence: 0, energy: 1 })
  })

  it("End jumps to bottom-right (low energy, pleasant)", () => {
    expect(jumpEdgeForKey("End")).toEqual({ valence: 1, energy: 0 })
  })

  it("returns null for other keys", () => {
    expect(jumpEdgeForKey("PageUp")).toBeNull()
    expect(jumpEdgeForKey("ArrowLeft")).toBeNull()
    expect(jumpEdgeForKey("a")).toBeNull()
  })
})

describe("moodWord", () => {
  it("matches the legacy moodWord() in step-mood.tsx for known regions", () => {
    // These thresholds are copied from the component on purpose — the test
    // documents the single source of truth we are committing to.
    expect(moodWord(0.9, 0.9)).toBe("Radiant")
    expect(moodWord(0.6, 0.6)).toBe("Bright")
    // v <= 0.5, e > 0.75 → Wired (e=0.8 > 0.75)
    expect(moodWord(0.3, 0.8)).toBe("Wired")
    // v <= 0.5, e > 0.5 (but <= 0.75) → Tense (e=0.6)
    expect(moodWord(0.3, 0.6)).toBe("Tense")
    // v > 0.5, e < 0.25 → Serene
    expect(moodWord(0.8, 0.1)).toBe("Serene")
    // v > 0.5, e <= 0.5 (but >= 0.25) → At ease
    expect(moodWord(0.6, 0.3)).toBe("At ease")
    // v <= 0.5, e < 0.25 → Drained
    expect(moodWord(0.2, 0.1)).toBe("Drained")
    // v <= 0.5, e <= 0.5 (but >= 0.25) → Low
    expect(moodWord(0.3, 0.3)).toBe("Low")
  })

  it("falls through to Low at the exact center (no Balanced bucket)", () => {
    // The component moodWord() also returns Low for the exact center
    // (v=0.5 falls into the v <= 0.5 branch). Document this so future
    // refactors don't silently introduce a 'Balanced' bucket that drifts.
    expect(moodWord(0.5, 0.5)).toBe("Low")
  })
})

describe("ariaValueTextForMood", () => {
  it("includes the mood word and both axes", () => {
    // Center falls into the Low bucket per the legacy thresholds.
    expect(ariaValueTextForMood({ valence: 0.5, energy: 0.5 })).toBe(
      "Low. Valence 50, energy 50."
    )
  })

  it("rounds percentages correctly", () => {
    // v=0.123 (low), e=0.876 (high) → v <= 0.5 && e > 0.75 → Wired.
    expect(ariaValueTextForMood({ valence: 0.123, energy: 0.876 })).toBe(
      "Wired. Valence 12, energy 88."
    )
  })

  it("clamps display to 0-100", () => {
    // valence=1, energy=0 → high valence, low energy → Serene (per the
    // legacy component moodWord() thresholds).
    expect(ariaValueTextForMood({ valence: 1, energy: 0 })).toBe(
      "Serene. Valence 100, energy 0."
    )
    // valence=0, energy=1 → low valence, high energy → Wired.
    expect(ariaValueTextForMood({ valence: 0, energy: 1 })).toBe(
      "Wired. Valence 0, energy 100."
    )
  })
})

describe("moodWordForAnnouncement", () => {
  it("matches moodWord for the same point", () => {
    const point: MoodPoint = { valence: 0.7, energy: 0.2 }
    expect(moodWordForAnnouncement(point)).toBe(moodWord(0.7, 0.2))
  })
})

describe("MOOD_GRID_KEYBOARD_HINT", () => {
  it("mentions arrow keys, Shift, PageUp/Down, and Home/End", () => {
    expect(MOOD_GRID_KEYBOARD_HINT).toContain("arrow keys")
    expect(MOOD_GRID_KEYBOARD_HINT).toContain("Shift")
    expect(MOOD_GRID_KEYBOARD_HINT).toContain("PageUp")
    expect(MOOD_GRID_KEYBOARD_HINT).toContain("PageDown")
    expect(MOOD_GRID_KEYBOARD_HINT).toContain("Home")
    expect(MOOD_GRID_KEYBOARD_HINT).toContain("End")
  })
})