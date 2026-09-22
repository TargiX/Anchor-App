import { describe, expect, it } from "vitest"
import { getGreeting } from "./context"


describe("getGreeting", () => {
  it("matches each time context with its greeting", () => {
    expect(getGreeting(8)).toBe("Good morning")
    expect(getGreeting(13)).toBe("Good afternoon")
    expect(getGreeting(20)).toBe("Good evening")
  })

  it("keeps the morning greeting until hour 12 and switches exactly there", () => {
    expect(getGreeting(11)).toBe("Good morning")
    expect(getGreeting(12)).toBe("Good afternoon")
    expect(getGreeting(17)).toBe("Good afternoon")
    expect(getGreeting(18)).toBe("Good evening")
  })
})

