import { describe, expect, it } from "vitest"
import {
  buildDailyReminderNotifications,
  REMINDER_NOTIFICATION_IDS,
} from "./native"

describe("buildDailyReminderNotifications", () => {
  it("builds stable daily native reminder requests", () => {
    const notifications = buildDailyReminderNotifications({
      morning: "08:15",
      evening: "20:45",
    })

    expect(notifications).toHaveLength(2)
    expect(notifications[0]).toMatchObject({
      id: REMINDER_NOTIFICATION_IDS.morning,
      title: "Morning ritual",
      schedule: { on: { hour: 8, minute: 15, second: 0 } },
    })
    expect(notifications[1]).toMatchObject({
      id: REMINDER_NOTIFICATION_IDS.evening,
      title: "Evening ritual",
      schedule: { on: { hour: 20, minute: 45, second: 0 } },
    })
  })

  it("drops malformed times instead of scheduling a bad notification", () => {
    const notifications = buildDailyReminderNotifications({
      morning: "25:00",
      evening: "20:00",
    })

    expect(notifications).toHaveLength(1)
    expect(notifications[0]?.id).toBe(REMINDER_NOTIFICATION_IDS.evening)
  })
})
