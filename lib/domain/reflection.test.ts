import { describe, it, expect } from "vitest"
import {
  moodOf,
  entriesInWindow,
  moodShift,
  averageValence,
  moodDirection,
  activeDays,
  averageSleepHours,
  consecutiveLowSleepNights,
  habitCounts,
  trendPoints,
} from "./reflection"
import type { DayEntry, MoodPoint } from "./entry"

const today = "2026-05-20"

function mood(valence: number, energy = 0.5): MoodPoint {
  return { energy, valence }
}

/** Build an entry for a given key with arbitrary overrides. */
function entry(date: string, over: Partial<DayEntry> = {}): DayEntry {
  return { date, ...over }
}

function map(...entries: DayEntry[]): Record<string, DayEntry> {
  return Object.fromEntries(entries.map((e) => [e.date, e]))
}

describe("moodOf", () => {
  it("prefers evening over morning, falls back to morning", () => {
    expect(moodOf(undefined)).toBeUndefined()
    expect(moodOf(entry("d"))).toBeUndefined()
    expect(moodOf(entry("d", { morningMood: mood(0.3) }))).toEqual(mood(0.3))
    expect(
      moodOf(entry("d", { morningMood: mood(0.3), eveningMood: mood(0.8) }))
    ).toEqual(mood(0.8))
  })
})

describe("entriesInWindow", () => {
  it("returns present entries oldest → newest, inclusive of today", () => {
    const entries = map(
      entry("2026-05-20"),
      entry("2026-05-18"),
      // 2026-05-19 absent
      entry("2026-05-12") // outside a 7-day window
    )
    const got = entriesInWindow(entries, today, 7).map((e) => e.date)
    expect(got).toEqual(["2026-05-18", "2026-05-20"])
  })
})

describe("moodShift", () => {
  it("is null unless both morning and evening moods exist", () => {
    expect(moodShift(undefined)).toBeNull()
    expect(moodShift(entry("d", { morningMood: mood(0.3) }))).toBeNull()
    expect(moodShift(entry("d", { eveningMood: mood(0.3) }))).toBeNull()
  })

  it("is evening minus morning on both axes", () => {
    const e = entry("d", {
      morningMood: { energy: 0.4, valence: 0.3 },
      eveningMood: { energy: 0.6, valence: 0.7 },
    })
    const shift = moodShift(e)!
    expect(shift.energy).toBeCloseTo(0.2)
    expect(shift.valence).toBeCloseTo(0.4)
  })
})

describe("averageValence", () => {
  it("is null when no moods in window", () => {
    expect(averageValence({}, today)).toBeNull()
    expect(averageValence(map(entry("2026-05-20")), today)).toBeNull()
  })

  it("averages valence using the representative mood per day", () => {
    const entries = map(
      entry("2026-05-20", { eveningMood: mood(0.8) }),
      entry("2026-05-19", { morningMood: mood(0.4) })
    )
    expect(averageValence(entries, today)).toBeCloseTo(0.6)
  })
})

describe("moodDirection", () => {
  it("is null until both halves of the window have a reading", () => {
    const recentOnly = map(
      entry("2026-05-20", { eveningMood: mood(0.8) }),
      entry("2026-05-19", { eveningMood: mood(0.8) })
    )
    expect(moodDirection(recentOnly, today)).toBeNull()
  })

  it("reports rising when the recent half is happier than the older half", () => {
    const entries = map(
      entry("2026-05-20", { eveningMood: mood(0.8) }),
      entry("2026-05-19", { eveningMood: mood(0.8) }),
      entry("2026-05-18", { eveningMood: mood(0.7) }),
      entry("2026-05-17", { eveningMood: mood(0.2) }),
      entry("2026-05-16", { eveningMood: mood(0.2) })
    )
    expect(moodDirection(entries, today)).toBe("rising")
  })

  it("reports falling when the recent half is sadder", () => {
    const entries = map(
      entry("2026-05-20", { eveningMood: mood(0.2) }),
      entry("2026-05-19", { eveningMood: mood(0.2) }),
      entry("2026-05-17", { eveningMood: mood(0.8) }),
      entry("2026-05-16", { eveningMood: mood(0.8) })
    )
    expect(moodDirection(entries, today)).toBe("falling")
  })

  it("reports steady when the halves are within epsilon", () => {
    const entries = map(
      entry("2026-05-20", { eveningMood: mood(0.5) }),
      entry("2026-05-19", { eveningMood: mood(0.5) }),
      entry("2026-05-17", { eveningMood: mood(0.52) }),
      entry("2026-05-16", { eveningMood: mood(0.5) })
    )
    expect(moodDirection(entries, today)).toBe("steady")
  })
})

describe("activeDays", () => {
  it("counts days with a completed ritual in the window", () => {
    const entries = map(
      entry("2026-05-20", { morningMood: mood(0.5), intention: "Be kind" }),
      entry("2026-05-19", { eveningMood: mood(0.5), journal: "Long day" }),
      entry("2026-05-18", { sleepHours: 7 }) // present but not active
    )
    expect(activeDays(entries, today, 7)).toEqual({ count: 2, of: 7 })
  })
})

describe("averageSleepHours", () => {
  it("is null with no recorded sleep", () => {
    expect(averageSleepHours({}, today)).toBeNull()
  })

  it("averages only recorded nights", () => {
    const entries = map(
      entry("2026-05-20", { sleepHours: 6 }),
      entry("2026-05-19", { sleepHours: 8 }),
      entry("2026-05-18", {}) // no sleep logged
    )
    expect(averageSleepHours(entries, today)).toBeCloseTo(7)
  })
})

describe("consecutiveLowSleepNights", () => {
  it("counts the run of recent sub-threshold nights", () => {
    const entries = map(
      entry("2026-05-20", { sleepHours: 5 }),
      entry("2026-05-19", { sleepHours: 5.5 }),
      entry("2026-05-18", { sleepHours: 7 }) // breaks the run
    )
    expect(consecutiveLowSleepNights(entries, today, 6)).toBe(2)
  })

  it("does not break when tonight is not logged yet", () => {
    const entries = map(
      entry("2026-05-20", {}), // today, no sleep yet
      entry("2026-05-19", { sleepHours: 5 }),
      entry("2026-05-18", { sleepHours: 5 }),
      entry("2026-05-17", { sleepHours: 8 })
    )
    expect(consecutiveLowSleepNights(entries, today, 6)).toBe(2)
  })

  it("is 0 when the most recent logged night is fine", () => {
    const entries = map(entry("2026-05-20", { sleepHours: 8 }))
    expect(consecutiveLowSleepNights(entries, today, 6)).toBe(0)
  })

  it("stops at a gap with no recorded value", () => {
    const entries = map(
      entry("2026-05-20", { sleepHours: 5 }),
      entry("2026-05-19", {}), // gap
      entry("2026-05-18", { sleepHours: 5 })
    )
    expect(consecutiveLowSleepNights(entries, today, 6)).toBe(1)
  })
})

describe("habitCounts", () => {
  it("tallies completed habit ids across the window", () => {
    const entries = map(
      entry("2026-05-20", { habitsCompleted: ["move", "water"] }),
      entry("2026-05-19", { habitsCompleted: ["move"] }),
      entry("2026-05-18", { habitsCompleted: [] })
    )
    expect(habitCounts(entries, today)).toEqual({ move: 2, water: 1 })
  })
})

describe("trendPoints", () => {
  it("emits one row per calendar day in the window, oldest → newest", () => {
    // 7-day window ending 2026-05-20 → keys 14..20
    const rows = trendPoints({}, today, 7).map((p) => p.date)
    expect(rows).toEqual([
      "2026-05-14",
      "2026-05-15",
      "2026-05-16",
      "2026-05-17",
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
    ])
  })

  it("keeps absent days as rows with undefined fields (honest gaps)", () => {
    const rows = trendPoints(
      map(
        entry("2026-05-19", { morningMood: mood(0.4), sleepHours: 7 }),
        // 2026-05-18 and 2026-05-20 have no entry
        entry("2026-05-17", { eveningMood: mood(0.8) })
      ),
      today,
      4
    )
    expect(rows).toHaveLength(4)
    expect(rows.map((r) => r.date)).toEqual([
      "2026-05-17",
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
    ])
    // only present-entry days carry values
    expect(rows[0]).toEqual({ date: "2026-05-17", eveningValence: 0.8 })
    expect(rows[1]).toEqual({ date: "2026-05-18" })
    expect(rows[2]).toEqual({
      date: "2026-05-19",
      morningValence: 0.4,
      sleepHours: 7,
    })
    expect(rows[3]).toEqual({ date: "2026-05-20" })
  })

  it("maps morning/evening valence and sleep hours independently", () => {
    const rows = trendPoints(
      map(
        entry("2026-05-20", {
          morningMood: { energy: 0.2, valence: 0.3 },
          eveningMood: { energy: 0.5, valence: 0.9 },
          sleepHours: 6.5,
        })
      ),
      today,
      1
    )
    expect(rows[0]).toBeDefined()
    expect(rows[0]!.morningValence).toBeCloseTo(0.3)
    expect(rows[0]!.eveningValence).toBeCloseTo(0.9)
    expect(rows[0]!.sleepHours).toBeCloseTo(6.5)
  })
})
