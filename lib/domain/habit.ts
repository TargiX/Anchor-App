import { z } from "zod"

/**
 * A trackable habit. `icon` is a stable string key resolved to a Lucide
 * component in the UI layer (see `components/habit-icon.tsx`) — the domain
 * stays free of React/icon dependencies so it remains serialisable.
 */
export const HabitSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
})
export type Habit = z.infer<typeof HabitSchema>

export const DEFAULT_HABITS: Habit[] = [
  { id: "move", name: "Move my body", icon: "footprints" },
  { id: "water", name: "Drink water", icon: "droplets" },
  { id: "read", name: "Read", icon: "book-open" },
  { id: "no-screens", name: "No screens before bed", icon: "moon" },
]
