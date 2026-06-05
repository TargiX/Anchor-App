import { describe, it, expect } from "vitest"
import { getTodayKey, parseEntryDate, shiftKey, dayDiff } from "./today"

describe("getTodayKey", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    // Local date, not UTC: noon avoids any timezone edge.
    expect(getTodayKey(new Date(2026, 0, 5, 12, 0, 0))).toBe("2026-01-05")
  })

  it("zero-pads month and day", () => {
    expect(getTodayKey(new Date(2026, 8, 9, 12))).toBe("2026-09-09")
  })

  it("uses the local calendar day even late at night", () => {
    // 23:30 local on the 5th must stay the 5th (the UTC-based bug filed it as the 6th).
    expect(getTodayKey(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05")
  })
})

describe("shiftKey", () => {
  it("moves backward across a month boundary", () => {
    expect(shiftKey("2026-03-01", -1)).toBe("2026-02-28")
  })

  it("moves forward", () => {
    expect(shiftKey("2026-12-31", 1)).toBe("2027-01-01")
  })

  it("is a no-op for 0", () => {
    expect(shiftKey("2026-06-15", 0)).toBe("2026-06-15")
  })
})

describe("dayDiff", () => {
  it("counts whole days between keys", () => {
    expect(dayDiff("2026-01-01", "2026-01-04")).toBe(3)
    expect(dayDiff("2026-01-04", "2026-01-01")).toBe(-3)
    expect(dayDiff("2026-01-01", "2026-01-01")).toBe(0)
  })
})

describe("parseEntryDate", () => {
  it("round-trips with getTodayKey", () => {
    expect(getTodayKey(parseEntryDate("2026-07-20"))).toBe("2026-07-20")
  })
})
