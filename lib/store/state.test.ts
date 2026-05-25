import { describe, it, expect } from "vitest"
import { migrate, INITIAL_STATE, STATE_VERSION } from "./state"

describe("migrate", () => {
  it("returns INITIAL_STATE for null/garbage", () => {
    expect(migrate(null)).toEqual(INITIAL_STATE)
    expect(migrate("not json shape")).toEqual(INITIAL_STATE)
    expect(migrate(42)).toEqual(INITIAL_STATE)
  })

  it("reads the current versioned envelope", () => {
    const data = {
      entries: { "2026-05-20": { date: "2026-05-20", intention: "Focus" } },
      habits: [{ id: "a", name: "Walk", icon: "footprints" }],
      notificationMorning: "07:30",
      notificationEvening: "21:00",
    }
    expect(migrate({ version: STATE_VERSION, data })).toEqual(data)
  })

  it("upgrades legacy flat v0 state and drops removed keys", () => {
    // Pre-refactor shape: extra streak/theme/focusAreas at top level.
    const legacy = {
      entries: {},
      habits: [{ id: "1", name: "Read", icon: "book-open" }],
      streak: 4,
      theme: "sepia",
      focusAreas: ["clarity"],
      notificationMorning: "08:00",
      notificationEvening: "20:00",
    }
    const result = migrate(legacy)
    expect(result).not.toHaveProperty("streak")
    expect(result).not.toHaveProperty("theme")
    expect(result).not.toHaveProperty("focusAreas")
    expect(result.habits).toHaveLength(1)
    expect(result.notificationMorning).toBe("08:00")
  })

  it("recovers partial state by filling defaults", () => {
    const result = migrate({ habits: [] })
    expect(result.habits).toEqual([])
    expect(result.entries).toEqual({})
    expect(result.notificationMorning).toBe(INITIAL_STATE.notificationMorning)
  })

  it("rejects entries with invalid mood values, falling back safely", () => {
    const bad = {
      version: STATE_VERSION,
      data: {
        entries: { d: { date: "d", morningMood: { energy: 5, valence: 0.2 } } },
        habits: [],
        notificationMorning: "08:00",
        notificationEvening: "20:00",
      },
    }
    // energy 5 is out of 0–1 range → strict parse fails → partial recovery
    // keeps the valid top-level fields but the bad entry is excluded.
    const result = migrate(bad)
    expect(result.habits).toEqual([])
    expect(result.entries).toEqual({})
  })
})
