import { afterEach, describe, expect, it, vi } from "vitest"
import { encodeJournalPhoto } from "./encode-photo"

afterEach(() => {
  vi.unstubAllGlobals()
})

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

  it("returns an error and closes the bitmap when JPEG conversion rejects", async () => {
    const close = vi.fn()
    vi.stubGlobal("createImageBitmap", async () => ({
      width: 10,
      height: 10,
      close,
    }))
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toBlob: (callback: (blob: Blob | null) => void) => callback(null),
      }),
    })

    await expect(encodeJournalPhoto(new Blob(["image"]))).resolves.toEqual({
      ok: false,
      error: "This photo couldn’t be added. Try another image.",
    })
    expect(close).toHaveBeenCalledOnce()
  })
})
