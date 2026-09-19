import { z } from "zod"
import { LIMITS } from "./validation"

const STRICT_BASE64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

function decodedPhotoBytes(data: string): Uint8Array | null {
  if (!STRICT_BASE64.test(data)) return null
  try {
    return Uint8Array.from(atob(data), (character) => character.charCodeAt(0))
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
    const bytes = decodedPhotoBytes(photo.data)
    return (
      bytes !== null &&
      bytes.length <= LIMITS.photoMaxBytes &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    )
  })

export type JournalPhoto = z.infer<typeof JournalPhotoSchema>

export function journalPhotoSrc(photo: JournalPhoto): string {
  return `data:${photo.mime};base64,${photo.data}`
}
