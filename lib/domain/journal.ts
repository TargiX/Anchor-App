import type { DayEntry } from "./entry"
import { entriesInWindow } from "./reflection"

export function matchesJournal(entry: DayEntry, query: string): boolean {
  const text = [
    entry.date,
    entry.journal,
    entry.intention,
    entry.affirmation,
    ...(entry.quickCheckIns ?? []).flatMap((note) => [
      note.note,
      note.nextStep,
    ]),
  ]
    .filter(Boolean)
    .join("\n")
    .toLocaleLowerCase()
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word))
}

/** An excerpt is a user's actual text, never an inferred theme or diagnosis. */
export function reviewExcerpts(
  entries: Record<string, DayEntry>,
  endDate: string
) {
  return entriesInWindow(entries, endDate).flatMap((entry) => [
    ...(entry.intention
      ? [{ date: entry.date, kind: "Intention", text: entry.intention }]
      : []),
    ...(entry.journal
      ? [{ date: entry.date, kind: "Reflection", text: entry.journal }]
      : []),
    ...(entry.quickCheckIns ?? []).map((note) => ({
      date: entry.date,
      kind: "Note",
      text: note.note,
    })),
  ])
}
