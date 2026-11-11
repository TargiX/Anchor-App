import { describe, expect, it } from "vitest"

import { ritualStepAnnouncement } from "./a11y"

describe("ritualStepAnnouncement", () => {
  it("announces the 1-based step within the ritual", () => {
    expect(ritualStepAnnouncement(0, 5, "Morning ritual")).toBe(
      "Step 1 of 5: Morning ritual"
    )
    expect(ritualStepAnnouncement(2, 5, "Evening ritual")).toBe(
      "Step 3 of 5: Evening ritual"
    )
    expect(ritualStepAnnouncement(4, 5, "Morning ritual")).toBe(
      "Step 5 of 5: Morning ritual"
    )
  })

  it("clamps out-of-range steps instead of announcing past the end", () => {
    expect(ritualStepAnnouncement(9, 5, "Morning ritual")).toBe(
      "Step 5 of 5: Morning ritual"
    )
    expect(ritualStepAnnouncement(-3, 5, "Morning ritual")).toBe(
      "Step 1 of 5: Morning ritual"
    )
  })

  it("falls back to a neutral ritual name for blank titles", () => {
    expect(ritualStepAnnouncement(0, 3, "")).toBe("Step 1 of 3: Daily ritual")
    expect(ritualStepAnnouncement(0, 3, "   ")).toBe(
      "Step 1 of 3: Daily ritual"
    )
  })

  it("never announces step 0 of 0 for degenerate totals", () => {
    expect(ritualStepAnnouncement(0, 0, "Morning ritual")).toBe(
      "Step 1 of 1: Morning ritual"
    )
  })
})
