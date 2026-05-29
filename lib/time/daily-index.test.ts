import { describe, expect, it } from "vitest"
import { getDailyIndex, pickDailyItems } from "./daily-index"

describe("getDailyIndex", () => {
  it("returns a stable index for a local day and salt", () => {
    const date = new Date(2026, 4, 28, 12)

    expect(getDailyIndex(8, "affirmation", date)).toBe(
      getDailyIndex(8, "affirmation", date)
    )
  })

  it("keeps the result inside the collection bounds", () => {
    expect(
      getDailyIndex(3, "prompt", new Date(2026, 0, 1, 12))
    ).toBeGreaterThanOrEqual(0)
    expect(getDailyIndex(3, "prompt", new Date(2026, 0, 1, 12))).toBeLessThan(3)
  })
})

describe("pickDailyItems", () => {
  it("picks a deterministic wrapped sequence", () => {
    const items = ["a", "b", "c"]
    const date = new Date(2026, 4, 28, 12)

    expect(pickDailyItems(items, 5, "suggestions", date)).toEqual(
      pickDailyItems(items, 5, "suggestions", date)
    )
    expect(pickDailyItems(items, 5, "suggestions", date)).toHaveLength(3)
  })
})
