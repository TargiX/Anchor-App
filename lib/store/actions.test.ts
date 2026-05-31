import { describe, it, expect, beforeEach } from "vitest"
import { getSnapshot, setState, setStorageScope, STORAGE_KEY } from "./store"
import { addHabit, removeHabit, updateTodayEntry, setNotificationTime } from "./actions"
import { INITIAL_STATE } from "./state"
import type { AppState } from "./state"

/** Reset store to INITIAL_STATE between tests. */
beforeEach(() => {
  setState(() => INITIAL_STATE)
})

describe("updateTodayEntry", () => {
  it("creates today's entry from patch", () => {
    updateTodayEntry({ intention: "Focus" })
    const s = getSnapshot()
    const key = Object.keys(s.entries)[0]
    expect(s.entries[key].intention).toBe("Focus")
  })

  it("merges into existing entry", () => {
    updateTodayEntry({ intention: "A" })
    updateTodayEntry({ journal: "Went well" })
    const s = getSnapshot()
    const key = Object.keys(s.entries)[0]
    expect(s.entries[key].intention).toBe("A")
    expect(s.entries[key].journal).toBe("Went well")
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
