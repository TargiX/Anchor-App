import { describe, expect, it } from "vitest"
import { createRitualHistoryExport } from "./ritual-history-export"
import type { DayEntry } from "./entry"
import type { Habit } from "./habit"

const habits: Habit[] = [
  { id: "read", name: "Read", icon: "book-open" },
  { id: "move", name: "Move my body", icon: "footprints" },
]

const olderEntry: DayEntry = {
  date: "2026-07-18",
  morningMood: { energy: 0.5, valence: 0.6 },
  sleepHours: 7.5,
  sleepQuality: "good",
  intention: "Ship one thing.",
  meditationMinutes: 10,
  affirmation: "I can move calmly.",
  tomorrowBedtime: "22:30",
  tomorrowSleepHours: 8,
}

const newerEntry: DayEntry = {
  date: "2026-07-19",
  eveningMood: { energy: 0.4, valence: 0.8 },
  journal: "Quiet finish.",
  habitsCompleted: ["read"],
}

describe("createRitualHistoryExport", () => {
  it("returns null when local history has no recorded ritual fields", () => {
    expect(
      createRitualHistoryExport({
        entries: {
          "2026-07-18": { date: "2026-07-18" },
          "2026-07-19": {
            date: "2026-07-19",
            intention: "   ",
            journal: "",
            affirmation: "\n",
          },
          "2026-07-20": {
            date: "2026-07-20",
            habitsCompleted: [],
          },
          "2026-07-21": {
            date: "2026-07-21",
            habitsCompleted: ["removed-habit"],
          },
        },
        habits,
        exportedOn: "2026-07-19",
      })
    ).toBeNull()
  })

  it("treats a skipped zero-minute meditation as unrecorded", () => {
    expect(
      createRitualHistoryExport({
        entries: {
          "2026-07-19": {
            date: "2026-07-19",
            meditationMinutes: 0,
          },
        },
        habits,
        exportedOn: "2026-07-19",
      })
    ).toBeNull()
  })

  it("omits a skipped meditation from an otherwise recorded day", () => {
    const result = createRitualHistoryExport({
      entries: {
        "2026-07-19": {
          date: "2026-07-19",
          journal: "Still recorded.",
          meditationMinutes: 0,
        },
      },
      habits,
      exportedOn: "2026-07-19",
    })

    expect(result?.markdown).toContain("Still recorded.")
    expect(result?.markdown).not.toContain("**Meditation:**")
  })

  it("produces the same complete Markdown in oldest-to-newest local-date order", () => {
    const reverseInserted = createRitualHistoryExport({
      entries: {
        "2026-07-19": newerEntry,
        "2026-07-18": olderEntry,
      },
      habits,
      exportedOn: "2026-07-20",
    })
    const forwardInserted = createRitualHistoryExport({
      entries: {
        "2026-07-18": olderEntry,
        "2026-07-19": newerEntry,
      },
      habits,
      exportedOn: "2026-07-20",
    })

    expect(reverseInserted).toEqual(forwardInserted)
    expect(reverseInserted).not.toBeNull()
    expect(reverseInserted?.filename).toBe(
      "anchor-ritual-history-2026-07-20.md"
    )
    expect(reverseInserted?.entryCount).toBe(2)

    const markdown = reverseInserted?.markdown ?? ""
    expect(markdown.indexOf("## 2026-07-18")).toBeLessThan(
      markdown.indexOf("## 2026-07-19")
    )
    expect(markdown).toContain("- Read\n- Move my body")
    expect(markdown).toContain("**Morning mood:** Energy 50% · valence 60%")
    expect(markdown).toContain("**Sleep:** 7.5 hours · good")
    expect(markdown).toContain("Ship one thing.")
    expect(markdown).toContain("**Meditation:** 10 minutes")
    expect(markdown).toContain("I can move calmly.")
    expect(markdown).toContain("**Evening mood:** Energy 40% · valence 80%")
    expect(markdown).toContain("Quiet finish.")
    expect(markdown).toContain("### Completed habits\n\n- Read")
    expect(markdown).toContain("**Tomorrow's sleep window:** 22:30 · 8 hours")
  })

  it("keeps Markdown structure safe without exposing hidden habit identifiers", () => {
    const result = createRitualHistoryExport({
      entries: {
        "2026-07-19": {
          date: "2026-07-19",
          journal: "First line\n```md\n# not a heading\n```\nLast line",
          habitsCompleted: ["removed-habit", "read"],
        },
      },
      habits: [
        {
          id: "read",
          name: "Read [deeply] *daily* &copy; ~weekly~\n- not another item",
          icon: "book-open",
        },
      ],
      exportedOn: "2026-07-20",
    })

    expect(result?.markdown).toContain(
      "- Read \\[deeply\\] \\*daily\\* \\&copy\\; \\~weekly\\~ \\- not another item"
    )
    expect(result?.markdown).not.toContain("\n- not another item")
    expect(result?.markdown).toContain(
      "### Journal\n\n````text\nFirst line\n```md\n# not a heading\n```\nLast line\n````"
    )
    expect(result?.markdown).not.toContain("removed-habit")
  })
})
