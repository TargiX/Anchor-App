import { z } from "zod"
import { LIMITS } from "./validation"

function decodedByteLength(data: string): number | null {
  try {
    if (typeof Buffer !== "undefined") return Buffer.from(data, "base64").length
    return atob(data).length
  } catch {
    return null
  }
}

export const JournalPhotoSchema = z
  .object({
    mime: z.literal("image/jpeg"),
    data: z.string().min(1).max(LIMITS.photoBase64Max),
  })
  .refine((photo) => {
    const bytes = decodedByteLength(photo.data)
    return bytes !== null && bytes > 0 && bytes <= LIMITS.photoMaxBytes
  })

export type JournalPhoto = z.infer<typeof JournalPhotoSchema>

export function journalPhotoSrc(photo: JournalPhoto): string {
  return `data:${photo.mime};base64,${photo.data}`
}
