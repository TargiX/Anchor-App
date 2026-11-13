import { describe, expect, it } from "vitest"
import { DEFAULT_HABITS, HabitSchema } from "./habit"

function validHabit() {
  return { id: "move", name: "Move my body", icon: "footprints" }
}

describe("HabitSchema", () => {
  it("accepts a well-formed habit", () => {
    expect(HabitSchema.safeParse(validHabit()).success).toBe(true)
  })

  it("accepts custom user-created habits with the neutral circle icon", () => {
    // see addHabit in lib/store/actions.ts: new habits start as icon "circle"
    expect(
      HabitSchema.safeParse({ id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", name: "Stretch", icon: "circle" })
        .success
    ).toBe(true)
  })

  it("rejects missing or non-string fields", () => {
    for (const bad of [
      {},
      { id: "a", name: "Read" },
      { id: "a", icon: "book-open" },
      { id: "a", name: 42, icon: "book-open" },
      { id: 7, name: "Read", icon: "book-open" },
      { id: "a", name: "Read", icon: null },
    ]) {
      expect(HabitSchema.safeParse(bad).success).toBe(false)
    }
  })
})

describe("DEFAULT_HABITS", () => {
  it("parses against HabitSchema", () => {
    for (const habit of DEFAULT_HABITS) {
      expect(HabitSchema.safeParse(habit).success).toBe(true)
    }
  })

  it("keeps the persisted default ids stable", () => {
    // These ids are persisted keys: entry.habitsCompleted references them and
    // the habits list itself is stored in user state. Renaming one silently
    // orphans every completion already tracked against the old id.
    expect(DEFAULT_HABITS.map((habit) => habit.id)).toEqual([
      "move",
      "water",
      "read",
      "no-screens",
    ])
  })

  it("uses icon keys the UI layer can resolve", () => {
    // components/habit-icon.tsx falls back to a neutral circle for unknown
    // keys; every default must resolve to a real icon, not the fallback.
    const RESOLVABLE = new Set(["footprints", "droplets", "book-open", "moon", "circle"])
    for (const habit of DEFAULT_HABITS) {
      expect(RESOLVABLE.has(habit.icon)).toBe(true)
    }
  })
})
