"use client"

import { useEffect } from "react"
import { useAppState } from "@/hooks/use-store"
import { useNotificationPermission, notify } from "@/lib/notifications"
import { msUntilNext } from "@/lib/notifications/schedule"

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
      { time: notificationMorning, title: "Morning ritual", body: "A quiet few minutes to anchor your day." },
      { time: notificationEvening, title: "Evening ritual", body: "Wind down and close the loop before bed." },
    ]

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
