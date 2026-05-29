import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AppState } from "@/lib/store/state"
import type { DayEntry } from "@/lib/domain/entry"

let todayEntry: DayEntry
let appState: AppState

vi.mock("@/hooks/use-store", () => ({
  useTodayEntry: () => todayEntry,
  useAppState: () => appState,
}))

vi.mock("@/lib/store", () => ({
  updateTodayEntry: vi.fn(),
}))

vi.mock("@/lib/time/today", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/time/today")>()
  return {
    ...actual,
    getTodayKey: () => "2026-05-20",
  }
})

describe("ritual review defaults", () => {
  beforeEach(() => {
    todayEntry = {
      date: "2026-05-20",
      sleepQuality: "great",
      sleepHours: 8.5,
      intention: "Move slowly",
      habitsCompleted: ["read"],
      tomorrowBedtime: "23:00",
      tomorrowSleepHours: 8,
    }

    appState = {
      entries: { "2026-05-20": todayEntry },
      habits: [
        { id: "read", name: "Read", icon: "book-open" },
        { id: "move", name: "Move my body", icon: "footprints" },
      ],
      notificationMorning: "08:00",
      notificationEvening: "20:00",
    }
  })

  it("renders an existing intention in review mode", async () => {
    const { StepIntention } = await import("./morning/step-intention")
    const html = renderToStaticMarkup(
      <StepIntention onNext={() => {}} onBack={() => {}} />
    )

    expect(html).toContain("Move slowly")
  })

  it("renders existing sleep values in review mode", async () => {
    const { StepSleep } = await import("./morning/step-sleep")
    const html = renderToStaticMarkup(
      <StepSleep onNext={() => {}} onBack={() => {}} />
    )

    expect(html).toContain("8.5h")
    expect(html).toContain("scale-105")
  })

  it("renders existing habit completion in review mode", async () => {
    const { StepHabits } = await import("./evening/step-habits")
    const html = renderToStaticMarkup(
      <StepHabits onNext={() => {}} onBack={() => {}} />
    )

    expect(html).toContain("Read")
    expect(html).toContain("border-accent")
  })

  it("renders existing sleep target values in review mode", async () => {
    const { StepSleepTarget } = await import("./evening/step-sleep-target")
    const html = renderToStaticMarkup(
      <StepSleepTarget onNext={() => {}} onBack={() => {}} />
    )

    expect(html).toContain("11:00 PM")
    expect(html).toContain("8h")
  })
})
