import { z } from "zod"

export const DailyReviewSchema = z.object({
  summary: z.string(),
  pattern: z.string(),
  nextStep: z.string(),
  evidence: z.array(z.string()).min(1).max(4),
  tone: z.enum(["gentle", "encouraging", "reflective"]),
})

export type DailyReview = z.infer<typeof DailyReviewSchema>
