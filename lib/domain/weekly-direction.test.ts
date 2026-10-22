import { describe, expect, it } from "vitest"
import { DayKeySchema } from "./entry"
import { WeeklyDirectionSchema, isOpenWeeklyDirection } from "./weekly-direction"

const weekEnd = DayKeySchema.parse("2026-10-18")
const sourceDay = DayKeySchema.parse("2026-10-14")
const sourceId = "3fa85f64-5717-4562-b3fc-2c963f66afa6"

function validDirection() {
  return {
    text: "Ship the sync smoke test",
    weekEnd,
    sourceDay,
    sourceId,
    status: "open" as const,
  }
}

describe("WeeklyDirectionSchema", () => {
  it("accepts a valid open direction", () => {
    expect(WeeklyDirectionSchema.safeParse(validDirection()).success).toBe(true)
  })

  it("accepts every status value and an optional resolvedOn", () => {
    for (const status of ["open", "finished", "released"] as const) {
      expect(
        WeeklyDirectionSchema.safeParse({ ...validDirection(), status }).success
      ).toBe(true)
    }
    expect(
      WeeklyDirectionSchema.safeParse({
        ...validDirection(),
        resolvedOn: sourceDay,
      }).success
    ).toBe(true)
  })

  it("rejects a blank or whitespace-only text", () => {
    for (const text of ["", "   "]) {
      expect(WeeklyDirectionSchema.safeParse({ ...validDirection(), text }).success).toBe(
        false
      )
    }
  })

  it("rejects text over the intention limit", () => {
    const tooLong = "x".repeat(201)
    expect(WeeklyDirectionSchema.safeParse({ ...validDirection(), text: tooLong }).success).toBe(
      false
    )
  })

  it("applies the length limit to the trimmed text", () => {
    // raw length fits an eyeball check but trims to 201 > LIMITS.intentionMax
    const padded = `  ${"x".repeat(201)}  `
    expect(
      WeeklyDirectionSchema.safeParse({ ...validDirection(), text: padded }).success
    ).toBe(false)
    // exactly the limit after trimming is fine
    const atLimit = `  ${"x".repeat(200)}  `
    expect(
      WeeklyDirectionSchema.safeParse({ ...validDirection(), text: atLimit }).success
    ).toBe(true)
  })

  it("rejects malformed day keys", () => {
    expect(
      WeeklyDirectionSchema.safeParse({ ...validDirection(), weekEnd: "2026/10/18" })
        .success
    ).toBe(false)
    expect(
      WeeklyDirectionSchema.safeParse({ ...validDirection(), sourceDay: "18-10-2026" })
        .success
    ).toBe(false)
  })

  it("rejects a non-uuid sourceId", () => {
    expect(
      WeeklyDirectionSchema.safeParse({ ...validDirection(), sourceId: "abc" }).success
    ).toBe(false)
  })

  it("rejects an unknown status", () => {
    expect(
      WeeklyDirectionSchema.safeParse({ ...validDirection(), status: "archived" }).success
    ).toBe(false)
  })

  it("rejects a resolvedOn that is not a day key", () => {
    expect(
      WeeklyDirectionSchema.safeParse({ ...validDirection(), resolvedOn: "tomorrow" })
        .success
    ).toBe(false)
  })
})

describe("isOpenWeeklyDirection", () => {
  it("narrows only open directions", () => {
    expect(isOpenWeeklyDirection(validDirection())).toBe(true)
    expect(
      isOpenWeeklyDirection({ ...validDirection(), status: "finished" })
    ).toBe(false)
    expect(
      isOpenWeeklyDirection({ ...validDirection(), status: "released" })
    ).toBe(false)
  })

  it("returns false for undefined", () => {
    expect(isOpenWeeklyDirection(undefined)).toBe(false)
  })
})
