import type { DayEntry } from "./entry"
import { entriesInWindow } from "./reflection"

export function hasFavorite(entry: DayEntry): boolean {
  return Boolean(
    entry.journalFavorite || entry.quickCheckIns?.some((note) => note.favorite)
  )
}

export function reviewNoteParts(note: string): {
  period?: string
  note: string
} {
  const match = /^Week in review \((.+?)\)\n/.exec(note)
  return match
    ? { period: match[1], note: note.slice(match[0].length) }
    : { note }
}

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
    ...(entry.quickCheckIns ?? []).map((note) => {
      const parts = reviewNoteParts(note.note)
      return {
        date: entry.date,
        kind: parts.period ? "Week" : "Note",
        text: parts.note,
      }
    }),
  ])
}
