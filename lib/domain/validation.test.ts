import { describe, it, expect } from "vitest"
import { countWords, validateHabitName, LIMITS } from "./validation"
import type { Habit } from "./habit"

describe("countWords", () => {
  it("counts words, not characters", () => {
    expect(countWords("hello world")).toBe(2)
    expect(countWords("  spaced   out  words ")).toBe(3)
  })
  it("is 0 for empty/whitespace", () => {
    expect(countWords("")).toBe(0)
    expect(countWords("   ")).toBe(0)
  })
})

describe("validateHabitName", () => {
  const habits: Habit[] = [
    { id: "1", name: "Read", icon: "book-open" },
    { id: "2", name: "Walk", icon: "footprints" },
  ]

  it("rejects empty", () => {
    expect(validateHabitName("   ", habits)).toEqual({ ok: false, error: "Enter a habit name." })
  })

  it("rejects too long", () => {
    const long = "x".repeat(LIMITS.habitNameMax + 1)
    expect(validateHabitName(long, habits).ok).toBe(false)
  })

  it("rejects case-insensitive duplicates", () => {
    expect(validateHabitName("read", habits)).toEqual({
      ok: false,
      error: "That habit already exists.",
    })
  })

  it("rejects when at the habit cap", () => {
    const full: Habit[] = Array.from({ length: LIMITS.habitsMax }, (_, i) => ({
      id: String(i),
      name: `Habit ${i}`,
      icon: "circle",
    }))
    expect(validateHabitName("New one", full).ok).toBe(false)
  })

  it("accepts a valid new name", () => {
    expect(validateHabitName("Meditate", habits)).toEqual({ ok: true })
  })
})
