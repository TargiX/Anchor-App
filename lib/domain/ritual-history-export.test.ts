import { describe, expect, it } from "vitest"
import {
  createRitualHistoryExport,
  sanitizeMarkdownText,
} from "./ritual-history-export"
import type { DayEntry } from "./entry"
import type { Habit } from "./habit"

const FORBIDDEN_CODE_POINTS = [0x00, 0x07, 0x1b, 0x7f, 0x80, 0x9f] as const

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

describe("sanitizeMarkdownText", () => {
  it("removes NUL/BEL/ESC/DEL and the C1 range while keeping printable text", () => {
    const dirty =
      "before\u0000after\u0007bell\u001bESC[\u007fDEL\u0080C1\u009fend"
    const cleaned = sanitizeMarkdownText(dirty)
    expect(cleaned).toBe("beforeafterbellESC[DELC1end")
    for (const codePoint of FORBIDDEN_CODE_POINTS) {
      expect(cleaned).not.toContain(String.fromCharCode(codePoint))
    }
  })

  it("preserves TAB and LF and strips every other C0 control byte", () => {
    const input = "line1\twith tab\nline2\u0001\u0002\u0003still line2"
    const cleaned = sanitizeMarkdownText(input)
    expect(cleaned).toBe("line1\twith tab\nline2still line2")
    expect(cleaned).toContain("\t")
    expect(cleaned).toContain("\n")
  })

  it("strips ANSI ESC bytes and terminal bell while preserving printable tails", () => {
    const input = "\u001b[31mred\u001b[0m \u001b]0;title\u0007plain"
    const cleaned = sanitizeMarkdownText(input)
    // The ESC (0x1B) and BEL (0x07) bytes are removed; printable bracket
    // tails remain (we do not parse full ANSI parameter grammars here).
    expect(cleaned).toBe("[31mred[0m ]0;titleplain")
    expect(cleaned).not.toContain("\u001b")
    expect(cleaned).not.toContain("\u0007")
  })
})

describe("createRitualHistoryExport control-byte sanitization", () => {
  function exportWith(polluter: { habit?: string; journal?: string }) {
    const entry: DayEntry = {
      date: "2026-07-19",
      habitsCompleted: ["read"],
    }
    if (polluter.journal !== undefined) entry.journal = polluter.journal
    return createRitualHistoryExport({
      entries: { "2026-07-19": entry },
      habits: [
        {
          id: "read",
          name: polluter.habit ?? "Read",
          icon: "book-open",
        },
      ],
      exportedOn: "2026-07-19",
    })
  }

  it("never emits forbidden control code points from inline habit names", () => {
    const dirtyName =
      "Read\u0000null\u0007bell\u001b[31mesc\u007fdel\u0080c1\u009fend"
    const result = exportWith({ habit: dirtyName })
    expect(result).not.toBeNull()
    const codes = FORBIDDEN_CODE_POINTS.map((cp) => String.fromCharCode(cp))
    for (const code of codes) {
      expect(result!.markdown).not.toContain(code)
    }
    expect(result!.markdown).toContain("Readnullbell\\[31mescdelc1end")
  })

  it("never emits forbidden control code points from fenced journal text", () => {
    const dirtyJournal =
      "open\u0000mid\u0007ESC\u001b[2J\u007fDEL\u0080CSI\u009fclose"
    const result = exportWith({ journal: dirtyJournal })
    expect(result).not.toBeNull()
    const codes = FORBIDDEN_CODE_POINTS.map((cp) => String.fromCharCode(cp))
    for (const code of codes) {
      expect(result!.markdown).not.toContain(code)
    }
    expect(result!.markdown).toContain("openmidESC[2JDELCSIclose")
  })

  it("normalizes CR to LF inside fenced blocks so fences stay parseable", () => {
    const journal = "first\rsecond\r\nthird"
    const result = exportWith({ journal: journal })
    expect(result).not.toBeNull()
    expect(result!.markdown).not.toContain("\r")
    expect(result!.markdown).toContain("first\nsecond\nthird")
    // Sanity: the trailing fence still closes the block.
    expect(result!.markdown).toMatch(/third\n```+$/m)
  })

  it("preserves intentional TAB and LF inside fenced journal text", () => {
    const journal = "col1\tcol2\nrow2\tdata"
    const result = exportWith({ journal })
    expect(result).not.toBeNull()
    expect(result!.markdown).toContain("col1\tcol2")
    expect(result!.markdown).toContain("row2\tdata")
    // The embedded newline must not break out of the fence.
    expect(result!.markdown).toContain("```text\ncol1\tcol2\nrow2\tdata\n```")
  })
})
