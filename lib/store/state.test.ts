import { describe, it, expect } from "vitest"
import { isEveningComplete, isMorningComplete } from "@/lib/domain/selectors"
import { LIMITS } from "@/lib/domain/validation"
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

  it("restores valid persisted morning and evening ritual cursors", () => {
    const result = migrate({
      version: STATE_VERSION,
      data: {
        ...INITIAL_STATE,
        entries: {
          "2026-07-21": {
            date: "2026-07-21",
            morningRitualStep: 3,
            eveningRitualStep: 2,
          },
        },
      },
    })

    expect(result.entries["2026-07-21"]?.morningRitualStep).toBe(3)
    expect(result.entries["2026-07-21"]?.eveningRitualStep).toBe(2)
  })

  it.each([
    ["a string", "2"],
    ["a fractional value", 1.5],
    ["a negative value", -1],
    ["an out-of-range morning value", LIMITS.morningRitualSteps],
  ])(
    "normalizes %s ritual cursor to zero without losing completed history",
    (_, cursor) => {
      const result = migrate({
        version: STATE_VERSION,
        data: {
          ...INITIAL_STATE,
          entries: {
            "2026-07-21": {
              date: "2026-07-21",
              morningMood: { energy: 0.6, valence: 0.7 },
              intention: "Finish the day calmly",
              eveningMood: { energy: 0.3, valence: 0.4 },
              journal: "A real entry stays intact",
              morningRitualStep: cursor,
              eveningRitualStep: LIMITS.eveningRitualSteps,
            },
          },
        },
      })
      const entry = result.entries["2026-07-21"]

      expect(entry?.morningRitualStep).toBe(0)
      expect(entry?.eveningRitualStep).toBe(0)
      expect(isMorningComplete(entry)).toBe(true)
      expect(isEveningComplete(entry)).toBe(true)
    }
  )

  it("keeps legacy entries without a cursor at the default ritual step", () => {
    const result = migrate({
      ...INITIAL_STATE,
      entries: { "2026-07-21": { date: "2026-07-21", journal: "legacy" } },
    })

    expect(result.entries["2026-07-21"]?.morningRitualStep).toBeUndefined()
    expect(result.entries["2026-07-21"]?.eveningRitualStep).toBeUndefined()
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
