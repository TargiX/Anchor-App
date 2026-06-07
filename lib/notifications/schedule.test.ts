import { describe, it, expect } from "vitest"
import { parseTime, nextOccurrence, msUntilNext } from "./schedule"

describe("parseTime", () => {
  it("parses valid HH:MM", () => {
    expect(parseTime("08:00")).toEqual({ hours: 8, minutes: 0 })
    expect(parseTime("9:30")).toEqual({ hours: 9, minutes: 30 })
    expect(parseTime("23:59")).toEqual({ hours: 23, minutes: 59 })
  })
  it("rejects malformed/out-of-range", () => {
    expect(parseTime("")).toBeNull()
    expect(parseTime("24:00")).toBeNull()
    expect(parseTime("12:60")).toBeNull()
    expect(parseTime("noon")).toBeNull()
  })
})

describe("nextOccurrence", () => {
  it("returns later today when the time is still ahead", () => {
    const from = new Date(2026, 4, 20, 7, 0, 0) // 07:00
    const next = nextOccurrence("08:00", from)!
    expect(next.getDate()).toBe(20)
    expect(next.getHours()).toBe(8)
    expect(next.getMinutes()).toBe(0)
  })

  it("rolls to tomorrow when the time has passed", () => {
    const from = new Date(2026, 4, 20, 9, 0, 0) // 09:00
    const next = nextOccurrence("08:00", from)!
    expect(next.getDate()).toBe(21)
    expect(next.getHours()).toBe(8)
  })

  it("rolls to tomorrow when exactly now", () => {
    const from = new Date(2026, 4, 20, 8, 0, 0)
    expect(nextOccurrence("08:00", from)!.getDate()).toBe(21)
  })

  it("returns null for invalid input", () => {
    expect(nextOccurrence("nope")).toBeNull()
  })
})

describe("msUntilNext", () => {
  it("computes the delay in ms", () => {
    const from = new Date(2026, 4, 20, 7, 0, 0)
    expect(msUntilNext("08:00", from)).toBe(60 * 60 * 1000)
  })
})
