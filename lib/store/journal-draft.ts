import { z } from "zod"
import { LIMITS } from "@/lib/domain/validation"

export const JournalDraftSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(LIMITS.journalMax),
  nextStep: z.string().max(LIMITS.intentionMax),
})
export const JournalDraftsSchema = z.record(z.string(), JournalDraftSchema)
export type JournalDraft = z.infer<typeof JournalDraftSchema>
