import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  changeWeeklyDirection,
  finishWeeklyDirection,
  releaseWeeklyDirection,
  saveQuickCheckIn,
} from "./actions"
import { localStorageAdapter } from "./persistence"
import {
  clearCloudPersistence,
  forceRehydrate,
  getSnapshot,
  hydrateFromStorage,
  setCloudPersistence,
  setState,
  setStorageScope,
} from "./store"
import { ANON_STORAGE_KEY, INITIAL_STATE, migrate } from "./state"
import { shouldResetGuestHistory } from "./guest-session"
import { activeDays } from "@/lib/domain/reflection"
import { createRitualHistoryExport } from "@/lib/domain/ritual-history-export"

const day = "2026-09-15"
const first = {
  id: "b054f9f9-e276-43fe-9663-d7f0071aa431",
  createdAt: "2026-09-15T08:00:00.000Z",
  note: "Too many messages",
  nextStep: "Open the document",
}
let disk: Map<string, string>

beforeEach(() => {
  disk = new Map()
  vi.spyOn(localStorageAdapter, "read").mockImplementation(
    (key) => disk.get(key) ?? null
  )
  vi.spyOn(localStorageAdapter, "write").mockImplementation((key, value) => {
    disk.set(key, value)
    return true
  })
  vi.spyOn(localStorageAdapter, "remove").mockImplementation((key) => {
    disk.delete(key)
  })
  clearCloudPersistence()
  setStorageScope("anon")
  setState(() => INITIAL_STATE)
  forceRehydrate()
})
afterEach(() => {
  clearCloudPersistence()
  vi.restoreAllMocks()
})

describe("quick check-in persistence", () => {
  it("appends repeated check-ins without replacing the journal or clearing an anchor", () => {
    setState((s) => ({
      ...s,
      entries: { [day]: { date: day, journal: "Original journal" } },
    }))
    expect(saveQuickCheckIn(first, day)).toEqual({ ok: true })
    expect(
      saveQuickCheckIn(
        {
          ...first,
          id: "d054f9f9-e276-43fe-9663-d7f0071aa431",
          note: "Taking a break",
          nextStep: "",
        },
        day
      ).ok
    ).toBe(true)
    expect(getSnapshot().entries[day]?.quickCheckIns).toHaveLength(2)
    expect(getSnapshot().entries[day]?.journal).toBe("Original journal")
    expect(getSnapshot().entries[day]?.intention).toBe(first.nextStep)
  })

  it("restores saved guest history after a fresh in-memory session", () => {
    saveQuickCheckIn(first, day)
    setStorageScope("local")
    hydrateFromStorage()
    expect(getSnapshot().entries[day]?.quickCheckIns).toEqual([first])
    expect(shouldResetGuestHistory(null)).toBe(false)
    expect(shouldResetGuestHistory("loading")).toBe(false)
    expect(shouldResetGuestHistory("anon")).toBe(false)
    expect(shouldResetGuestHistory("authed")).toBe(true)
  })

  it("does not publish or sync a failed disk write, and retries without duplicate records", () => {
    hydrateFromStorage()
    const sync = vi.fn()
    setCloudPersistence(sync)
    vi.mocked(localStorageAdapter.write).mockReturnValueOnce(false)
    expect(saveQuickCheckIn(first, day).ok).toBe(false)
    expect(getSnapshot().entries[day]).toBeUndefined()
    expect(sync).not.toHaveBeenCalled()
    expect(saveQuickCheckIn(first, day).ok).toBe(true)
    expect(saveQuickCheckIn(first, day).ok).toBe(true)
    expect(getSnapshot().entries[day]?.quickCheckIns).toHaveLength(1)
  })

  it("keeps separate accounts isolated", () => {
    saveQuickCheckIn(first, day)
    setStorageScope("authed", "other-user")
    hydrateFromStorage()
    expect(getSnapshot().entries).toEqual({})
    expect(disk.get(ANON_STORAGE_KEY)).toContain(first.note)
  })

  it("rejects empty or oversized input without writing", () => {
    expect(saveQuickCheckIn({ ...first, note: "  " }, day).ok).toBe(false)
    expect(
      saveQuickCheckIn({ ...first, nextStep: "x".repeat(201) }, day).ok
    ).toBe(false)
    expect(getSnapshot().entries).toEqual({})
  })

  it("uses the submission day after local midnight", () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 8, 16, 0, 1))
      saveQuickCheckIn(first)
      expect(getSnapshot().entries["2026-09-16"]?.quickCheckIns).toHaveLength(1)
      expect(getSnapshot().entries[day]).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it("round trips the schema and exports notes, including a note without a next step", () => {
    saveQuickCheckIn({ ...first, nextStep: "" }, day)
    const restored = migrate(JSON.parse(disk.get(ANON_STORAGE_KEY)!))
    expect(restored.entries[day]?.quickCheckIns?.[0]?.note).toBe(first.note)
    const output = createRitualHistoryExport({ ...restored, exportedOn: day })
    expect(output?.markdown).toContain(first.note)
    expect(output?.entryCount).toBe(1)
    expect(activeDays(restored.entries, day).count).toBe(1)
    expect(
      migrate({
        ...INITIAL_STATE,
        entries: { [day]: { date: day, journal: "Legacy" } },
      }).entries[day]?.journal
    ).toBe("Legacy")
  })

  it("keeps a review next step on Today without rewriting the morning anchor", () => {
    setState((s) => ({
      ...s,
      entries: { [day]: { date: day, intention: "Write one paragraph" } },
    }))
    expect(
      saveQuickCheckIn(
        {
          ...first,
          note: "Week in review",
          nextStep: "Call Ada",
        },
        day,
        { weeklyReviewEnd: day }
      )
    ).toEqual({ ok: true })
    expect(getSnapshot().entries[day]?.intention).toBe("Write one paragraph")
    expect(getSnapshot().weeklyDirection).toEqual({
      text: "Call Ada",
      weekEnd: day,
      sourceDay: day,
      sourceId: first.id,
      status: "open",
    })
  })

  it("lets the person finish, change, or let go without making a new day", () => {
    saveQuickCheckIn(
      { ...first, nextStep: "Call Ada" },
      day,
      { weeklyReviewEnd: day }
    )
    expect(changeWeeklyDirection("Send the note")).toBe(true)
    expect(getSnapshot().weeklyDirection?.text).toBe("Send the note")
    expect(finishWeeklyDirection()).toBe(true)
    expect(getSnapshot().weeklyDirection?.status).toBe("finished")
    expect(getSnapshot().weeklyDirection?.resolvedOn).toBeDefined()
    expect(Object.keys(getSnapshot().entries)).toEqual([day])
    expect(releaseWeeklyDirection()).toBe(false)
  })

  it("lets the person let go without creating another day", () => {
    saveQuickCheckIn(
      { ...first, nextStep: "Call Ada" },
      day,
      { weeklyReviewEnd: day }
    )
    expect(releaseWeeklyDirection()).toBe(true)
    expect(getSnapshot().weeklyDirection?.status).toBe("released")
    expect(Object.keys(getSnapshot().entries)).toEqual([day])
  })

  it("persists a photo on the note and round-trips it", () => {
    const photo = { mime: "image/jpeg" as const, data: "QQ==" }
    expect(saveQuickCheckIn({ ...first, nextStep: "", photo }, day).ok).toBe(
      true
    )
    expect(getSnapshot().entries[day]?.quickCheckIns?.[0]?.photo).toEqual(photo)
    const restored = migrate(JSON.parse(disk.get(ANON_STORAGE_KEY)!))
    expect(restored.entries[day]?.quickCheckIns?.[0]?.photo).toEqual(photo)
    const output = createRitualHistoryExport({ ...restored, exportedOn: day })
    expect(output?.markdown).toContain("**Photo attached**")
  })
})
