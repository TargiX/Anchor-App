import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  forceRehydrate,
  getSnapshot,
  hydrateFromStorage,
  resetState,
  replaceState,
} from "./store"
import { INITIAL_STATE, type AppState } from "./state"

describe("forceRehydrate", () => {
  beforeEach(() => {
    resetState()
    forceRehydrate()
  })

  afterEach(() => {
    resetState()
    forceRehydrate()
  })

  it("clears the hydrate guard so a subsequent hydrate re-reads storage", () => {
    // First hydrate is a no-op-from-storage (storage is empty in this tab).
    hydrateFromStorage()
    expect(getSnapshot()).toEqual(INITIAL_STATE)

    // Simulate a follow-up write that diverges from the on-disk snapshot.
    const next: AppState = {
      ...INITIAL_STATE,
      notificationMorning: "09:00",
    }
    replaceState(next)
    expect(getSnapshot().notificationMorning).toBe("09:00")

    // hydrateFromStorage is still a no-op because the guard is set.
    hydrateFromStorage()
    expect(getSnapshot().notificationMorning).toBe("09:00")

    // After forceRehydrate the guard is cleared; the next hydrate observes
    // whatever the persistence adapter has stored (which is `next` here).
    forceRehydrate()
    hydrateFromStorage()
    expect(getSnapshot()).toEqual(next)
  })

  it("supports authed→anon sign-out flow without leaving prior user data", () => {
    // Authed user has a personalized entry persisted.
    const authed: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-21": { date: "2026-06-21", journal: "private journal" },
      },
    }
    replaceState(authed)
    expect(getSnapshot().entries["2026-06-21"]?.journal).toBe("private journal")

    // Tab hydrates once on first authed mount.
    hydrateFromStorage()

    // Sign-out: clear prior user, allow rehydrate on the next authed session.
    resetState()
    forceRehydrate()

    // The next anon visitor hitting the same tab must see an empty state
    // (in-memory state is INITIAL_STATE; storage was cleared by resetState).
    expect(getSnapshot()).toEqual(INITIAL_STATE)

    // When the next authed session starts, hydrateFromStorage is allowed
    // again. The prior user's data must not reappear from anywhere
    // (storage was cleared; the in-memory state is INITIAL_STATE).
    hydrateFromStorage()
    expect(getSnapshot().entries["2026-06-21"]).toBeUndefined()
  })
})
