import { z } from "zod"
import { JournalPhotoSchema } from "./photo"
import { LIMITS } from "./validation"

export const QuickCheckInSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  note: z.string().trim().min(1).max(LIMITS.journalMax),
  nextStep: z.string().trim().max(LIMITS.intentionMax),
  favorite: z.boolean().optional(),
  photo: JournalPhotoSchema.optional(),
})

export type QuickCheckIn = z.infer<typeof QuickCheckInSchema>
