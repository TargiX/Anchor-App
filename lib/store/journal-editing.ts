import {
  QuickCheckInSchema,
  type QuickCheckIn,
} from "@/lib/domain/quick-checkin"
import { LIMITS } from "@/lib/domain/validation"
import { commitLocalState, getSnapshot, getStorageIdentity } from "./store"

export type JournalTarget = { day: string; id?: string }
export type JournalText = { note: string; nextStep: string }
type Original = QuickCheckIn | string
export type DeletedNote = {
  target: JournalTarget
  original: Original
  identity: string | null
  index: number
}

function current(target: JournalTarget): Original | undefined {
  const entry = getSnapshot().entries[target.day]
  return target.id
    ? entry?.quickCheckIns?.find((item) => item.id === target.id)
    : entry?.journal
}
export function readJournalText(target: JournalTarget): JournalText | null {
  const value = current(target)
  return value === undefined
    ? null
    : typeof value === "string"
      ? { note: value, nextStep: "" }
      : { note: value.note, nextStep: value.nextStep }
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function editJournalText(
  target: JournalTarget,
  expected: JournalText,
  next: JournalText
): boolean {
  if (
    !same(readJournalText(target), expected) ||
    !next.note.trim() ||
    next.note.trim().length > LIMITS.journalMax ||
    next.nextStep.length > LIMITS.intentionMax
  )
    return false
  const value = current(target)
  if (value === undefined) return false
  const updated =
    typeof value === "string"
      ? next.note.trim()
      : QuickCheckInSchema.parse({ ...value, ...next })
  return commitLocalState((state) => ({
    ...state,
    entries: {
      ...state.entries,
      [target.day]: {
        ...state.entries[target.day],
        date: target.day,
        ...(target.id
          ? {
              quickCheckIns: state.entries[target.day]?.quickCheckIns?.map(
                (item) =>
                  item.id === target.id ? (updated as QuickCheckIn) : item
              ),
            }
          : { journal: updated as string }),
      },
    },
  }))
}

export function deleteJournalText(
  target: JournalTarget,
  expected: JournalText
): DeletedNote | null {
  if (!same(readJournalText(target), expected)) return null
  const original = current(target)
  if (original === undefined) return null
  const index =
    getSnapshot().entries[target.day]?.quickCheckIns?.findIndex(
      (item) => item.id === target.id
    ) ?? -1
  const token = { target, original, identity: getStorageIdentity(), index }
  const saved = commitLocalState((state) => {
    const entry = { ...state.entries[target.day], date: target.day }
    if (target.id)
      entry.quickCheckIns = entry.quickCheckIns?.filter(
        (item) => item.id !== target.id
      )
    else delete entry.journal
    // Retain the day and its other fields so deleting text doesn't erase rituals.
    return { ...state, entries: { ...state.entries, [target.day]: entry } }
  })
  return saved ? token : null
}

export function undoJournalDeletion(token: DeletedNote): boolean {
  if (
    !token.identity ||
    token.identity !== getStorageIdentity() ||
    current(token.target) !== undefined
  )
    return false
  return commitLocalState((state) => {
    const entry = {
      ...(state.entries[token.target.day] ?? { date: token.target.day }),
    }
    if (typeof token.original === "string") entry.journal = token.original
    else {
      const notes = [...(entry.quickCheckIns ?? [])]
      notes.splice(
        Math.max(0, Math.min(token.index, notes.length)),
        0,
        token.original
      )
      entry.quickCheckIns = notes
    }
    return {
      ...state,
      entries: { ...state.entries, [token.target.day]: entry },
    }
  })
}
