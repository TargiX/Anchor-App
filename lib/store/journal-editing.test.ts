import { beforeEach, expect, it, vi, type Mock } from "vitest"
import { INITIAL_STATE, ANON_STORAGE_KEY, STATE_VERSION } from "./state"

const day = "2026-09-15"
const original = {
  id: "b054f9f9-e276-43fe-9663-d7f0071aa431",
  createdAt: "2026-09-15T08:00:00.000Z",
  note: "Original",
  nextStep: "Walk",
}
const target = { day, id: original.id }
const text = { note: original.note, nextStep: original.nextStep }
let store: typeof import("./store")
let editing: typeof import("./journal-editing")
let disk: Map<string, string>
let adapter: {
  read: (key: string) => string | null
  write: Mock<(key: string, value: string) => boolean>
  keys: () => string[]
  remove: (key: string) => void
}

beforeEach(async () => {
  vi.resetModules()
  store = await import("./store")
  editing = await import("./journal-editing")
  disk = new Map([
    [
      ANON_STORAGE_KEY,
      JSON.stringify({
        version: STATE_VERSION,
        data: {
          ...INITIAL_STATE,
          entries: {
            [day]: {
              date: day,
              journal: "Evening",
              intention: "Keep this anchor",
              sleepHours: 8,
              quickCheckIns: [original],
            },
          },
        },
      }),
    ],
  ])
  adapter = {
    read: (key) => disk.get(key) ?? null,
    write: vi.fn((key: string, value: string) => {
      disk.set(key, value)
      return true
    }),
    keys: () => [...disk.keys()],
    remove: (key) => {
      disk.delete(key)
    },
  }
  store.installDeviceStorage(adapter, async () => true)
  store.setStorageScope("anon")
  store.hydrateFromStorage()
})

it("edits only the selected text, preserving identity, date and other day fields", () => {
  expect(
    editing.editJournalText(target, text, { note: "Changed", nextStep: "Rest" })
  ).toBe(true)
  expect(store.getSnapshot().entries[day]).toMatchObject({
    journal: "Evening",
    intention: "Keep this anchor",
    sleepHours: 8,
    quickCheckIns: [{ ...original, note: "Changed", nextStep: "Rest" }],
  })
  store.forceRehydrate()
  store.hydrateFromStorage()
  expect(editing.readJournalText(target)?.note).toBe("Changed")
})
it("rejects stale edits and deletion instead of overwriting newer text", () => {
  editing.editJournalText(target, text, { ...text, note: "Another device" })
  expect(
    editing.editJournalText(target, text, { ...text, note: "Stale edit" })
  ).toBe(false)
  expect(editing.deleteJournalText(target, text)).toBeNull()
  expect(editing.readJournalText(target)?.note).toBe("Another device")
})
it("deletes and restores a note without replacing new neighboring content", () => {
  const token = editing.deleteJournalText(target, text)!
  expect(editing.readJournalText(target)).toBeNull()
  store.commitLocalState((state) => ({
    ...state,
    entries: {
      ...state.entries,
      [day]: { ...state.entries[day], date: day, journal: "New evening text" },
    },
  }))
  expect(editing.undoJournalDeletion(token)).toBe(true)
  expect(store.getSnapshot().entries[day]!.journal).toBe("New evening text")
  expect(editing.readJournalText(target)).toEqual(text)
  expect(editing.undoJournalDeletion(token)).toBe(false)
})
it("never applies undo to another account", () => {
  const token = editing.deleteJournalText(target, text)!
  store.setStorageScope("authed", "another-user")
  expect(editing.undoJournalDeletion(token)).toBe(false)
  expect(store.getSnapshot().entries).toEqual({})
})
it("supports evening journal editing and undo without clearing rituals", () => {
  const target = { day }
  expect(
    editing.editJournalText(
      target,
      { note: "Evening", nextStep: "" },
      { note: "Revised evening", nextStep: "" }
    )
  ).toBe(true)
  const token = editing.deleteJournalText(target, {
    note: "Revised evening",
    nextStep: "",
  })!
  expect(store.getSnapshot().entries[day]!.sleepHours).toBe(8)
  expect(editing.undoJournalDeletion(token)).toBe(true)
  expect(store.getSnapshot().entries[day]!.journal).toBe("Revised evening")
})
it("does not publish changes when synchronous storage rejects the write", () => {
  adapter.write.mockReturnValue(false)
  expect(
    editing.editJournalText(target, text, { ...text, note: "Changed" })
  ).toBe(false)
  expect(editing.deleteJournalText(target, text)).toBeNull()
  expect(editing.readJournalText(target)).toEqual(text)
})
it("preserves device drafts across saved edits, cloud replacements, and reinitialization", () => {
  const cloud = vi.fn()
  store.setCloudPersistence(cloud)
  const draft = { ...original, day, note: "Unfinished" }
  expect(store.saveJournalDraft("today", draft)).toBe(true)
  expect(cloud).not.toHaveBeenCalled()
  editing.editJournalText(target, text, { ...text, note: "Changed" })
  expect(cloud.mock.calls[0]![0]).not.toHaveProperty("localDrafts")
  store.replaceState(INITIAL_STATE, { persistCloud: false })
  store.installDeviceStorage(adapter, async () => true)
  store.hydrateFromStorage()
  expect(store.getJournalDrafts().today).toEqual(draft)
  expect(store.saveJournalDraft("today", null)).toBe(true)
  expect(store.getJournalDrafts()).toEqual({})
})
it("isolates draft contexts and clears private drafts on logout", () => {
  const draft = { ...original, day }
  store.saveJournalDraft("today", draft)
  store.saveJournalDraft("review:week1", { ...draft, note: "Review" })
  store.setStorageScope("authed", "person")
  expect(store.getJournalDrafts()).toEqual({})
  store.saveJournalDraft("today", { ...draft, note: "Private" })
  store.clearAuthedSlot("person")
  expect(store.getJournalDrafts()).toEqual({})
  store.setStorageScope("anon")
  expect(store.getJournalDrafts()["review:week1"]!.note).toBe("Review")
  store.resetAnonSlot()
  expect(store.getJournalDrafts()).toEqual({})
})
it("refuses to overwrite an unreadable envelope while saving a draft", () => {
  disk.set(ANON_STORAGE_KEY, "broken")
  expect(store.saveJournalDraft("today", { ...original, day })).toBe(false)
  expect(disk.get(ANON_STORAGE_KEY)).toBe("broken")
})
