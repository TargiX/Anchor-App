import { describe, expect, it } from "vitest"
import { computeDailyAnchor } from "./daily-anchor"
import type { DayEntry } from "./entry"
import type { Habit } from "./habit"

const habits: Habit[] = [
  { id: "move", name: "Move", icon: "footprints" },
  { id: "read", name: "Read", icon: "book-open" },
]

function entry(overrides: Partial<DayEntry> = {}): DayEntry {
  return { date: "2026-06-15", ...overrides }
}

describe("computeDailyAnchor", () => {
  it("returns an empty snapshot when no signals exist", () => {
    const snapshot = computeDailyAnchor(entry(), habits)

    expect(snapshot.score).toBe(0)
    expect(snapshot.tone).toBe("empty")
    expect(snapshot.nextStep).toBe("Start with mood and intention.")
  })

  it("gives partial credit for started rituals", () => {
    const snapshot = computeDailyAnchor(
      entry({ morningMood: { energy: 0.5, valence: 0.6 } }),
      habits
    )

    expect(snapshot.score).toBeGreaterThan(0)
    expect(snapshot.score).toBeLessThan(45)
    expect(snapshot.tone).toBe("started")
  })

  it("connects a complete day into an anchored score", () => {
    const snapshot = computeDailyAnchor(
      entry({
        morningMood: { energy: 0.4, valence: 0.4 },
        eveningMood: { energy: 0.6, valence: 0.7 },
        intention: "Move steadily",
        journal: "A calmer day than expected.",
        habitsCompleted: ["move", "read"],
        sleepHours: 7.5,
        tomorrowBedtime: "22:30",
      }),
      habits
    )

    expect(snapshot.score).toBe(100)
    expect(snapshot.tone).toBe("anchored")
    expect(snapshot.metrics.find((m) => m.id === "mood")?.value).toBe("+30%")
  })
})
