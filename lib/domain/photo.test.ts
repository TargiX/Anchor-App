import { describe, expect, it } from "vitest"
import { JournalPhotoSchema } from "./photo"
import { LIMITS } from "./validation"

const tinyPhoto = {
  mime: "image/jpeg" as const,
  data: "QQ==",
}

describe("journal photo schema", () => {
  it("accepts a small jpeg payload", () => {
    expect(JournalPhotoSchema.parse(tinyPhoto)).toEqual(tinyPhoto)
  })

  it("rejects an oversized payload without reading it as a journal note", () => {
    const data = Buffer.alloc(LIMITS.photoMaxBytes + 1).toString("base64")
    expect(
      JournalPhotoSchema.safeParse({ mime: "image/jpeg", data }).success
    ).toBe(false)
  })
})
