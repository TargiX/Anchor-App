import { afterEach, describe, expect, it, vi } from "vitest"
import { encodeJournalPhoto } from "./encode-photo"
import { LIMITS } from "@/lib/domain/validation"

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

  it("does not close an unbuilt bitmap when decoding rejects", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      async () => {
        throw new Error("unsupported image")
      }
    )
    // No canvas is installed: reaching canvasFor would return null via the
    // missing document global and mask a misplaced bitmap.close().
    await expect(encodeJournalPhoto(new Blob(["image"]))).resolves.toEqual({
      ok: false,
      error: "This photo couldn’t be added. Try another image.",
    })
  })

  it("reports exhaustion when every downscale stays over the size limit", async () => {
    const close = vi.fn()
    vi.stubGlobal("createImageBitmap", async () => ({
      width: 4000,
      height: 3000,
      close,
    }))
    vi.stubGlobal("document", {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toBlob: (callback: (blob: Blob | null) => void) =>
          callback(new Blob([new Uint8Array(LIMITS.photoMaxBytes + 1)])),
      }),
    })

    await expect(encodeJournalPhoto(new Blob(["image"]))).resolves.toEqual({
      ok: false,
      error: "That photo is too detailed to keep in the journal. Try another.",
    })
    expect(close).toHaveBeenCalledOnce()
  })
})
