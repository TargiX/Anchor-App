import { describe, expect, it } from "vitest"
import { getGreeting, getTimeContext, getTimeLabel } from "./context"

describe("getTimeContext", () => {
  it("maps early hours onto morning", () => {
    expect(getTimeContext(0)).toBe("morning")
    expect(getTimeContext(6)).toBe("morning")
    expect(getTimeContext(11)).toBe("morning")
  })

  it("switches to midday exactly at hour 12 and to evening at hour 18", () => {
    expect(getTimeContext(12)).toBe("midday")
    expect(getTimeContext(17)).toBe("midday")
    expect(getTimeContext(18)).toBe("evening")
  })

  it("keeps evening through the rest of the day", () => {
    expect(getTimeContext(18)).toBe("evening")
    expect(getTimeContext(23)).toBe("evening")
  })
})

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

describe("getTimeLabel", () => {
  it("labels the ritual prompt per time context", () => {
    expect(getTimeLabel(9)).toBe("Morning ritual")
    expect(getTimeLabel(15)).toBe("Quick check-in")
    expect(getTimeLabel(21)).toBe("Evening ritual")
  })

  it("stays consistent with getTimeContext at every boundary hour", () => {
    const labelsByContext: Record<string, string> = {
      morning: "Morning ritual",
      midday: "Quick check-in",
      evening: "Evening ritual",
    }
    for (let hour = 0; hour < 24; hour += 1) {
      expect(getTimeLabel(hour)).toBe(labelsByContext[getTimeContext(hour)])
    }
  })
})
