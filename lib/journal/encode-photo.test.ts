import { describe, expect, it } from "vitest"
import { encodeJournalPhoto } from "./encode-photo"

describe("encodeJournalPhoto", () => {
  it("does not invent a photo when the image decoder is unavailable", async () => {
    await expect(encodeJournalPhoto(new Blob(["x"]))).resolves.toEqual({
      ok: false,
      error: "Photos can’t be added in this browser.",
    })
  })

  it("rejects an empty file", async () => {
    await expect(encodeJournalPhoto(new Blob([]))).resolves.toEqual({
      ok: false,
      error: "Choose a photo from this device.",
    })
  })
})
