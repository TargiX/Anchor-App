import { describe, expect, it } from "vitest"
import { matchesJournal, reviewExcerpts } from "./journal"

const entry = {
  date: "2026-09-15",
  journal: "A quiet WALK",
  intention: "Call family",
  quickCheckIns: [
    {
      id: "note",
      createdAt: "2026-09-15T10:00:00Z",
      note: "Lunch with Ada",
      nextStep: "Book a table",
    },
  ],
}

describe("journal search and review", () => {
  it("finds words across notes, reflections, intentions and next steps", () => {
    expect(matchesJournal(entry, "  walk ADA ")).toBe(true)
    expect(matchesJournal(entry, "table")).toBe(true)
    expect(matchesJournal(entry, "2026-09")).toBe(true)
    expect(matchesJournal(entry, " ")).toBe(true)
    expect(matchesJournal(entry, "missing")).toBe(false)
  })
  it("uses only the seven selected local days and preserves exact source text", () => {
    const excerpts = reviewExcerpts(
      {
        "2026-09-08": { date: "2026-09-08", journal: "Outside" },
        "2026-09-09": { date: "2026-09-09", journal: "First day" },
        "2026-09-15": entry,
        "2026-09-16": { date: "2026-09-16", journal: "Future" },
      },
      "2026-09-15"
    )
    expect(excerpts.map((item) => item.text)).toEqual([
      "First day",
      "Call family",
      "A quiet WALK",
      "Lunch with Ada",
    ])
    expect(excerpts.at(-1)?.date).toBe("2026-09-15")
  })
  it("does not invent a reflection from empty days or mood-only entries", () => {
    expect(
      reviewExcerpts(
        {
          "2026-09-15": {
            date: "2026-09-15",
            morningMood: { valence: 0.5, energy: 0.5 },
          },
        },
        "2026-09-15"
      )
    ).toEqual([])
  })
})
