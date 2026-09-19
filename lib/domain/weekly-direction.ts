import { z } from "zod"
import { DayKeySchema } from "./entry"
import { LIMITS } from "./validation"

export const WeeklyDirectionSchema = z.object({
  text: z.string().trim().min(1).max(LIMITS.intentionMax),
  weekEnd: DayKeySchema,
  sourceDay: DayKeySchema,
  sourceId: z.string().uuid(),
  status: z.enum(["open", "finished", "released"]),
  resolvedOn: DayKeySchema.optional(),
})

export type WeeklyDirection = z.infer<typeof WeeklyDirectionSchema>

export function isOpenWeeklyDirection(
  direction: WeeklyDirection | undefined
): direction is WeeklyDirection {
  return direction?.status === "open"
}
