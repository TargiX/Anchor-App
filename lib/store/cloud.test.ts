import { describe, expect, it } from "vitest"
import { mergeCloudState } from "./cloud"
import { INITIAL_STATE, type AppState } from "./state"

describe("mergeCloudState", () => {
  it("keeps remote entries and lets local entries win for the same date", () => {
    const remote: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-06": { date: "2026-06-06", journal: "remote" },
        "2026-06-07": { date: "2026-06-07", intention: "remote" },
      },
    }
    const local: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-07": { date: "2026-06-07", intention: "local" },
      },
    }

    expect(mergeCloudState(local, remote).entries).toEqual({
      "2026-06-06": { date: "2026-06-06", journal: "remote" },
      "2026-06-07": { date: "2026-06-07", intention: "local" },
    })
  })

  it("uses remote settings until local settings are customized", () => {
    const remote: AppState = {
      ...INITIAL_STATE,
      notificationMorning: "07:15",
      notificationEvening: "22:00",
    }
    const local: AppState = INITIAL_STATE

    expect(mergeCloudState(local, remote)).toMatchObject({
      notificationMorning: "07:15",
      notificationEvening: "22:00",
    })
  })
})
