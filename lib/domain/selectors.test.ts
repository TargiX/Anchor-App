import { describe, it, expect } from "vitest"
import {
  isMorningComplete,
  isEveningComplete,
  isDayActive,
  computeStreak,
} from "./selectors"
import type { DayEntry, MoodPoint } from "./entry"

const mood: MoodPoint = { energy: 0.6, valence: 0.7 }

function morning(date: string): DayEntry {
  return { date, morningMood: mood, intention: "Be present" }
}
function evening(date: string): DayEntry {
  return { date, eveningMood: mood, journal: "Good day" }
}

describe("completion selectors", () => {
  it("requires both mood and intention for morning", () => {
    expect(isMorningComplete(undefined)).toBe(false)
    expect(isMorningComplete({ date: "d", morningMood: mood })).toBe(false)
    expect(isMorningComplete(morning("d"))).toBe(true)
  })

  it("requires both mood and journal for evening", () => {
    expect(isEveningComplete({ date: "d", journal: "x" })).toBe(false)
    expect(isEveningComplete(evening("d"))).toBe(true)
  })

  it("isDayActive is true if either ritual is done", () => {
    expect(isDayActive({ date: "d" })).toBe(false)
    expect(isDayActive(morning("d"))).toBe(true)
    expect(isDayActive(evening("d"))).toBe(true)
  })
})

describe("computeStreak", () => {
  const today = "2026-05-20"

  it("is 0 with no entries", () => {
    expect(computeStreak({}, today)).toBe(0)
  })

  it("counts a run ending today", () => {
    const entries = {
      "2026-05-18": morning("2026-05-18"),
      "2026-05-19": evening("2026-05-19"),
      "2026-05-20": morning("2026-05-20"),
    }
    expect(computeStreak(entries, today)).toBe(3)
  })

  it("does not break when today is not done yet (counts back from yesterday)", () => {
    const entries = {
      "2026-05-18": morning("2026-05-18"),
      "2026-05-19": evening("2026-05-19"),
      // today empty
    }
    expect(computeStreak(entries, today)).toBe(2)
  })

  it("resets after a fully missed day", () => {
    const entries = {
      "2026-05-16": morning("2026-05-16"),
      // 2026-05-17 missed
      "2026-05-19": evening("2026-05-19"),
      "2026-05-20": morning("2026-05-20"),
    }
    expect(computeStreak(entries, today)).toBe(2)
  })

  it("ignores days with an entry object but no completed ritual", () => {
    const entries = {
      "2026-05-19": { date: "2026-05-19", sleepHours: 7 }, // not active
      "2026-05-20": morning("2026-05-20"),
    }
    expect(computeStreak(entries, today)).toBe(1)
  })
})
