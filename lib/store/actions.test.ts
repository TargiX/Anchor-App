import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearCloudPersistence,
  getSnapshot,
  setCloudPersistence,
  setState,
} from "./store"
import {
  addHabit,
  applyInboundCloudState,
  clearRitualCursor,
  removeHabit,
  setRitualCursor,
  setNotificationTime,
  updateTodayEntry,
} from "./actions"
import { INITIAL_STATE } from "./state"
import { getTodayKey, shiftKey } from "@/lib/time/today"

beforeEach(() => {
  clearCloudPersistence()
  setState(() => INITIAL_STATE)
})

describe("applyInboundCloudState", () => {
  it("updates local state without invoking cloud persistence", () => {
    const persistCloud = vi.fn()
    const inboundState = {
      ...INITIAL_STATE,
      notificationMorning: "07:15",
    }
    setCloudPersistence(persistCloud)

    applyInboundCloudState(inboundState)

    expect(getSnapshot()).toBe(inboundState)
    expect(persistCloud).not.toHaveBeenCalled()
  })
})

describe("updateTodayEntry", () => {
  it("creates today's entry from patch", () => {
    updateTodayEntry({ intention: "Focus" })
    const s = getSnapshot()
    const entry = s.entries[getTodayKey()]
    expect(entry).toBeDefined()
    expect(entry?.intention).toBe("Focus")
  })

  it("merges into existing entry", () => {
    updateTodayEntry({ intention: "A" })
    updateTodayEntry({ journal: "Went well" })
    const s = getSnapshot()
    const entry = s.entries[getTodayKey()]
    expect(entry).toBeDefined()
    expect(entry?.intention).toBe("A")
    expect(entry?.journal).toBe("Went well")
  })
})

describe("ritual cursors", () => {
  it("persists meaningful forward and backward navigation on today's entry", () => {
    setRitualCursor("morning", 3)
    setRitualCursor("morning", 2)

    expect(getSnapshot().entries[getTodayKey()]?.morningRitualStep).toBe(2)
  })

  it("ignores invalid cursor values", () => {
    setRitualCursor("evening", -1)
    setRitualCursor("evening", 5)
    setRitualCursor("evening", 1.5)

    expect(getSnapshot().entries[getTodayKey()]).toBeUndefined()
  })

  it("writes the cursor only to today's local calendar entry", () => {
    const yesterday = shiftKey(getTodayKey(), -1)
    setState((state) => ({
      ...state,
      entries: { [yesterday]: { date: yesterday, journal: "keep this" } },
    }))

    setRitualCursor("evening", 3)

    expect(getSnapshot().entries[yesterday]?.eveningRitualStep).toBeUndefined()
    expect(getSnapshot().entries[getTodayKey()]?.eveningRitualStep).toBe(3)
  })

  it("clears the cursor without changing completed ritual data", () => {
    updateTodayEntry({
      morningMood: { energy: 0.6, valence: 0.7 },
      intention: "Keep the meaningful data",
    })
    setRitualCursor("morning", 5)
    clearRitualCursor("morning")

    expect(getSnapshot().entries[getTodayKey()]).toEqual({
      date: getTodayKey(),
      morningMood: { energy: 0.6, valence: 0.7 },
      intention: "Keep the meaningful data",
    })
  })
})

describe("addHabit / removeHabit", () => {
  it("adds a valid habit", () => {
    const result = addHabit("Meditate")
    expect(result.ok).toBe(true)
    expect(getSnapshot().habits.some((h) => h.name === "Meditate")).toBe(true)
  })

  it("rejects empty name", () => {
    const result = addHabit("")
    expect(result.ok).toBe(false)
  })

  it("rejects duplicate name", () => {
    addHabit("Read")
    const result = addHabit("Read")
    expect(result.ok).toBe(false)
  })

  it("removes a habit by id", () => {
    addHabit("Temp")
    const { id } = getSnapshot().habits.find((h) => h.name === "Temp")!
    removeHabit(id)
    expect(getSnapshot().habits.some((h) => h.id === id)).toBe(false)
  })
})

describe("setNotificationTime", () => {
  it("sets a valid morning time", () => {
    setNotificationTime("morning", "07:30")
    expect(getSnapshot().notificationMorning).toBe("07:30")
  })

  it("ignores invalid time", () => {
    const before = getSnapshot().notificationEvening
    setNotificationTime("evening", "25:00")
    expect(getSnapshot().notificationEvening).toBe(before)
  })
})
