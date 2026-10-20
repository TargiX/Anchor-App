import { describe, expect, it } from "vitest"
import { LIMITS } from "./validation"
import { QuickCheckInSchema } from "./quick-checkin"

const id = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
const createdAt = "2026-10-20T03:40:00.000Z"

function validCheckIn() {
  return {
    id,
    createdAt,
    note: "Shipped the pilot form",
    nextStep: "Wire the webhook retry",
  }
}

describe("QuickCheckInSchema", () => {
  it("accepts a valid check-in", () => {
    expect(QuickCheckInSchema.safeParse(validCheckIn()).success).toBe(true)
  })

  it("accepts an optional favorite flag", () => {
    expect(
      QuickCheckInSchema.safeParse({ ...validCheckIn(), favorite: true }).success
    ).toBe(true)
  })

  it("accepts an optional journal photo", () => {
    // jpeg magic bytes (ffd8ff) inside the strict-base64 + size boundary
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x11, 0x22])
    let binary = ""
    for (const b of bytes) binary += String.fromCharCode(b)
    const data = btoa(binary)
    const photo = { mime: "image/jpeg" as const, data }
    expect(
      QuickCheckInSchema.safeParse({ ...validCheckIn(), photo }).success
    ).toBe(true)
  })

  it("rejects a blank or whitespace-only note", () => {
    for (const note of ["", "   "]) {
      expect(QuickCheckInSchema.safeParse({ ...validCheckIn(), note }).success).toBe(
        false
      )
    }
  })

  it("rejects a note over the journal limit", () => {
    const tooLong = "x".repeat(LIMITS.journalMax + 1)
    expect(QuickCheckInSchema.safeParse({ ...validCheckIn(), note: tooLong }).success).toBe(
      false
    )
  })

  it("applies the journal limit to the trimmed note", () => {
    const atLimit = `  ${"x".repeat(LIMITS.journalMax)}  `
    const overLimit = `  ${"x".repeat(LIMITS.journalMax + 1)}  `
    expect(QuickCheckInSchema.safeParse({ ...validCheckIn(), note: atLimit }).success).toBe(
      true
    )
    expect(
      QuickCheckInSchema.safeParse({ ...validCheckIn(), note: overLimit }).success
    ).toBe(false)
  })

  it("rejects a nextStep over the intention limit", () => {
    const tooLong = "x".repeat(LIMITS.intentionMax + 1)
    expect(
      QuickCheckInSchema.safeParse({ ...validCheckIn(), nextStep: tooLong }).success
    ).toBe(false)
  })

  it("rejects a non-uuid id", () => {
    expect(QuickCheckInSchema.safeParse({ ...validCheckIn(), id: "abc" }).success).toBe(
      false
    )
  })

  it("rejects a non-ISO createdAt", () => {
    expect(
      QuickCheckInSchema.safeParse({ ...validCheckIn(), createdAt: "20-10-2026" }).success
    ).toBe(false)
  })

  it("rejects a photo that is not a real jpeg", () => {
    const notJpeg = { mime: "image/jpeg" as const, data: btoa("hello") }
    expect(
      QuickCheckInSchema.safeParse({ ...validCheckIn(), photo: notJpeg }).success
    ).toBe(false)
    const wrongMime = { mime: "image/png" as const, data: btoa("hello") }
    expect(
      QuickCheckInSchema.safeParse({ ...validCheckIn(), photo: wrongMime }).success
    ).toBe(false)
  })
})
