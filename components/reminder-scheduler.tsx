"use client"

import { useEffect } from "react"
import { useAppState } from "@/hooks/use-store"
import {
  useNotificationPermission,
  notify,
  scheduleDailyReminders,
  usesNativeScheduler,
} from "@/lib/notifications"
import { msUntilNext } from "@/lib/notifications/schedule"

const MORNING_REMINDER_ID = 1_001
const EVENING_REMINDER_ID = 1_002

/**
 * Fires the morning/evening reminders at their configured times while the app
 * is open. Renders nothing. Reliable background delivery (app closed) is a
 * native concern handled by the Capacitor adapter — see `lib/notifications`.
 */
export function ReminderScheduler() {
  const { notificationMorning, notificationEvening } = useAppState()
  const permission = useNotificationPermission()

  useEffect(() => {
    if (permission !== "granted") return

    const reminders = [
      {
        id: MORNING_REMINDER_ID,
        time: notificationMorning,
        title: "Morning ritual",
        body: "A quiet few minutes to anchor your day.",
      },
      {
        id: EVENING_REMINDER_ID,
        time: notificationEvening,
        title: "Evening ritual",
        body: "Wind down and close the loop before bed.",
      },
    ]

    if (usesNativeScheduler()) {
      void scheduleDailyReminders(reminders)
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []

    for (const reminder of reminders) {
      const schedule = () => {
        const delay = msUntilNext(reminder.time)
        if (delay == null) return
        const timer = setTimeout(() => {
          notify(reminder.title, { body: reminder.body })
          schedule() // re-arm for the next day
        }, delay)
        timers.push(timer)
      }
      schedule()
    }

    return () => timers.forEach(clearTimeout)
  }, [notificationMorning, notificationEvening, permission])

  return null
}
