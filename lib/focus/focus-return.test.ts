import { describe, expect, it } from "vitest"
import { readFocusReturnFrom } from "./focus-return"

describe("focus return marker", () => {
  it("marks only the arrival straight after a completed Focus reset", () => {
    expect(readFocusReturnFrom(() => "?after=focus")).toBe(true)
    expect(readFocusReturnFrom(() => "?after=app")).toBe(false)
    expect(readFocusReturnFrom(() => "")).toBe(false)
  })

  it("ignores unrelated query parameters and repeated markers", () => {
    expect(readFocusReturnFrom(() => "?source=focus")).toBe(false)
    expect(readFocusReturnFrom(() => "?after=focus&step=2")).toBe(true)
    expect(readFocusReturnFrom(() => "?pre=1&after=focus")).toBe(true)
  })

  it("treats an exact match, not a substring, as the marker", () => {
    expect(readFocusReturnFrom(() => "?after=focuses")).toBe(false)
    expect(readFocusReturnFrom(() => "?after=Focus")).toBe(false)
  })

  it("keeps Pulse usable when the location is unreadable", () => {
    expect(readFocusReturnFrom(() => {
      throw new Error("Location access denied")
    })).toBe(false)
  })
})
