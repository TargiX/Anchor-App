import { JournalPhotoSchema, type JournalPhoto } from "@/lib/domain/photo"
import { LIMITS, type ValidationResult } from "@/lib/domain/validation"

export type EncodedPhoto = ValidationResult & { photo?: JournalPhoto }

function canvasFor(
  width: number,
  height: number
): {
  canvas: HTMLCanvasElement
  toBlob: (quality: number) => Promise<Blob>
} | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return {
    canvas,
    toBlob: (quality) =>
      new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Could not encode photo")),
          "image/jpeg",
          quality
        )
      }),
  }
}

async function jpegFromBitmap(
  bitmap: ImageBitmap,
  edge: number,
  quality: number
): Promise<Blob | null> {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const target = canvasFor(width, height)
  const ctx = target?.canvas.getContext("2d")
  if (!target || !ctx) return null
  ctx.drawImage(bitmap, 0, 0, width, height)
  return target.toBlob(quality)
}

async function photoFromBlob(blob: Blob): Promise<EncodedPhoto> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const parsed = JournalPhotoSchema.safeParse({
    mime: "image/jpeg",
    data: btoa(binary),
  })
  return parsed.success
    ? { ok: true, photo: parsed.data }
    : {
        ok: false,
        error: "That photo couldn’t be saved. Try a smaller image.",
      }
}

export async function encodeJournalPhoto(file: Blob): Promise<EncodedPhoto> {
  if (file.size === 0) {
    return { ok: false, error: "Choose a photo from this device." }
  }
  if (typeof createImageBitmap !== "function") {
    return {
      ok: false,
      error: "Photos can’t be added in this browser.",
    }
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return {
      ok: false,
      error: "This photo couldn’t be added. Try another image.",
    }
  }
  try {
    const attempts: Array<[number, number]> = [
      [LIMITS.photoMaxEdge, 0.82],
      [960, 0.64],
      [720, 0.48],
      [480, 0.4],
    ]
    for (const [edge, quality] of attempts) {
      const blob = await jpegFromBitmap(bitmap, edge, quality)
      if (!blob || blob.size > LIMITS.photoMaxBytes) continue
      const encoded = await photoFromBlob(blob)
      if (encoded.ok) return encoded
    }
    return {
      ok: false,
      error: "That photo is too detailed to keep in the journal. Try another.",
    }
  } finally {
    bitmap.close()
  }
}
