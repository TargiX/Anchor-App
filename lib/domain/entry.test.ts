import { describe, expect, it } from "vitest"
import { DayEntrySchema, MiddayCheckInSchema } from "./entry"

const legacyEntry = {
  date: "2026-07-26",
  intention: "Keep the next step small",
}

describe("MiddayCheckInSchema", () => {
  it("accepts only deliberate midday check-in states", () => {
    expect(MiddayCheckInSchema.safeParse("on-track").success).toBe(true)
    expect(MiddayCheckInSchema.safeParse("reset").success).toBe(true)
    expect(MiddayCheckInSchema.safeParse("pivot").success).toBe(true)
    expect(MiddayCheckInSchema.safeParse("later").success).toBe(false)
  })
})

describe("DayEntrySchema midday check-in", () => {
  it("keeps legacy entries valid without a check-in", () => {
    expect(DayEntrySchema.safeParse(legacyEntry)).toMatchObject({ success: true })
  })

  it("persists a valid midday check-in alongside the day's intention", () => {
    expect(
      DayEntrySchema.parse({ ...legacyEntry, middayCheckIn: "reset" })
    ).toMatchObject({
      intention: "Keep the next step small",
      middayCheckIn: "reset",
    })
  })
})
