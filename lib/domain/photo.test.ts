import { describe, expect, it } from "vitest"
import { JournalPhotoSchema } from "./photo"
import { LIMITS } from "./validation"

const tinyPhoto = {
  mime: "image/jpeg" as const,
  data: "/9j/2Q==",
}

describe("journal photo schema", () => {
  it("accepts a small jpeg payload", () => {
    expect(JournalPhotoSchema.parse(tinyPhoto)).toEqual(tinyPhoto)
  })

  it("rejects an oversized payload without reading it as a journal note", () => {
    const data = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.alloc(LIMITS.photoMaxBytes - 2),
    ]).toString("base64")
    expect(
      JournalPhotoSchema.safeParse({ mime: "image/jpeg", data }).success
    ).toBe(false)
  })

  it("rejects non-JPEG bytes and non-canonical Base64", () => {
    expect(
      JournalPhotoSchema.safeParse({ mime: "image/jpeg", data: "QQ==" }).success
    ).toBe(false)
    expect(
      JournalPhotoSchema.safeParse({
        mime: "image/jpeg",
        data: "/9j/2Q==ignored",
      }).success
    ).toBe(false)
  })
})
