"use client"

import { Capacitor } from "@capacitor/core"
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from "@capacitor/local-notifications"
import { parseTime } from "./schedule"
import type {
  DailyReminderConfig,
  NotificationPort,
  PermissionState,
} from "./port"

export const REMINDER_NOTIFICATION_IDS = {
  morning: 8101,
  evening: 8102,
} as const

const TEST_NOTIFICATION_ID_BASE = 9000

function mapPermission(display: string | undefined): PermissionState {
  if (display === "granted") return "granted"
  if (display === "denied") return "denied"
  return "default"
}

function notificationIdForNow(): number {
  return TEST_NOTIFICATION_ID_BASE + Math.floor(Date.now() % 1000)
}

export function buildDailyReminderNotifications({
  morning,
  evening,
}: DailyReminderConfig): LocalNotificationSchema[] {
  const reminders = [
    {
      id: REMINDER_NOTIFICATION_IDS.morning,
      time: morning,
      title: "Morning ritual",
      body: "A quiet few minutes to anchor your day.",
      kind: "morning",
    },
    {
      id: REMINDER_NOTIFICATION_IDS.evening,
      time: evening,
      title: "Evening ritual",
      body: "Wind down and close the loop before bed.",
      kind: "evening",
    },
  ] as const

  return reminders.flatMap((reminder) => {
    const parsed = parseTime(reminder.time)
    if (!parsed) return []

    return {
      id: reminder.id,
      title: reminder.title,
      body: reminder.body,
      schedule: {
        on: {
          hour: parsed.hours,
          minute: parsed.minutes,
          second: 0,
        },
      },
      threadIdentifier: "anchor-reminders",
      extra: {
        source: "anchor",
        kind: reminder.kind,
      },
    } satisfies LocalNotificationSchema
  })
}

let cachedPermission: PermissionState = "default"

export const capacitorNotificationAdapter: NotificationPort = {
  mode: "native",
  isSupported() {
    return typeof window !== "undefined" && Capacitor.isNativePlatform()
  },
  getPermission() {
    return this.isSupported() ? cachedPermission : "unsupported"
  },
  async refreshPermission() {
    if (!this.isSupported()) {
      cachedPermission = "unsupported"
      return cachedPermission
    }
    try {
      const status = await LocalNotifications.checkPermissions()
      cachedPermission = mapPermission(status.display)
      return cachedPermission
    } catch {
      cachedPermission = "unsupported"
      return cachedPermission
    }
  },
  async requestPermission() {
    if (!this.isSupported()) return "unsupported"
    try {
      const status = await LocalNotifications.requestPermissions()
      cachedPermission = mapPermission(status.display)
      return cachedPermission
    } catch {
      cachedPermission = "denied"
      return cachedPermission
    }
  },
  notify(title, options) {
    if (this.getPermission() !== "granted") return
    void LocalNotifications.schedule({
      notifications: [
        {
          id: notificationIdForNow(),
          title,
          body: options?.body ?? "",
          threadIdentifier: "anchor-reminders",
          extra: { source: "anchor", kind: "test" },
        },
      ],
    })
  },
  async scheduleDailyReminders(reminders) {
    if ((await this.refreshPermission?.()) !== "granted") return
    const notifications = buildDailyReminderNotifications(reminders)
    await this.cancelDailyReminders?.()
    if (notifications.length === 0) return
    await LocalNotifications.schedule({ notifications })
  },
  async cancelDailyReminders() {
    if (!this.isSupported()) return
    await LocalNotifications.cancel({
      notifications: [
        { id: REMINDER_NOTIFICATION_IDS.morning },
        { id: REMINDER_NOTIFICATION_IDS.evening },
      ],
    })
  },
}
