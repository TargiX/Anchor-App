import { Capacitor } from "@capacitor/core"
import { LocalNotifications } from "@capacitor/local-notifications"
import { parseTime } from "./schedule"

/**
 * Notification boundary. The app talks to a `NotificationPort`, never to a
 * concrete browser/native API directly.
 */
export type PermissionState = "unsupported" | "default" | "granted" | "denied"

export interface ReminderNotification {
  id: number
  time: string
  title: string
  body: string
}

export interface NotificationPort {
  isSupported(): boolean
  usesNativeScheduler(): boolean
  getPermission(): PermissionState
  requestPermission(): Promise<PermissionState>
  /** Fire a notification immediately (used for tests / in-session fallback). */
  notify(title: string, options?: { body?: string }): void
  /** Schedule/cancel durable daily reminders where the platform supports it. */
  scheduleDailyReminders(reminders: ReminderNotification[]): Promise<void>
}

function mapNativePermission(permission: string): PermissionState {
  if (permission === "granted" || permission === "denied") return permission
  return "default"
}

let nativePermission: PermissionState = "default"

function rememberNativePermission(permission: string): PermissionState {
  nativePermission = mapNativePermission(permission)
  return nativePermission
}

/**
 * Native adapter (Capacitor LocalNotifications).
 *
 * On iOS/Android this schedules real OS-level daily reminders, so delivery is
 * not tied to a live browser tab or foreground web view.
 */
export const nativeNotificationAdapter: NotificationPort = {
  isSupported() {
    return typeof window !== "undefined" && Capacitor.isNativePlatform()
  },
  usesNativeScheduler() {
    return this.isSupported()
  },
  getPermission() {
    if (!this.isSupported()) return "unsupported"
    // Capacitor permission checks are async. Keep the last known state so the
    // reactive permission signal does not revert to "default" immediately after
    // `requestPermission()` resolves.
    return nativePermission
  },
  async requestPermission() {
    if (!this.isSupported()) return "unsupported"
    const current = await LocalNotifications.checkPermissions()
    if (current.display === "granted" || current.display === "denied") {
      return rememberNativePermission(current.display)
    }
    const requested = await LocalNotifications.requestPermissions()
    return rememberNativePermission(requested.display)
  },
  notify(title, options) {
    if (!this.isSupported()) return
    void LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now() % 2_147_483_647,
          title,
          body: options?.body ?? "",
        },
      ],
    }).catch(() => undefined)
  },
  async scheduleDailyReminders(reminders) {
    if (!this.isSupported()) return

    await LocalNotifications.cancel({
      notifications: reminders.map((reminder) => ({ id: reminder.id })),
    }).catch(() => undefined)

    const notifications = reminders.flatMap((reminder) => {
      const parsed = parseTime(reminder.time)
      if (!parsed) return []
      return [
        {
          id: reminder.id,
          title: reminder.title,
          body: reminder.body,
          schedule: {
            on: { hour: parsed.hours, minute: parsed.minutes },
            repeats: true,
          },
        },
      ]
    })

    if (notifications.length === 0) return
    await LocalNotifications.schedule({ notifications })
  },
}

/**
 * Web adapter (Notification API).
 *
 * Honest limitation: the browser can only deliver these while a tab is open.
 * Reliable closed-app delivery is handled by `nativeNotificationAdapter` inside
 * the Capacitor shell.
 */
export const webNotificationAdapter: NotificationPort = {
  isSupported() {
    return typeof window !== "undefined" && "Notification" in window
  },
  usesNativeScheduler() {
    return false
  },
  getPermission() {
    if (!this.isSupported()) return "unsupported"
    return Notification.permission as PermissionState
  },
  async requestPermission() {
    if (!this.isSupported()) return "unsupported"
    try {
      return (await Notification.requestPermission()) as PermissionState
    } catch {
      return "denied"
    }
  },
  notify(title, options) {
    if (this.getPermission() !== "granted") return
    try {
      new Notification(title, { body: options?.body })
    } catch {
      // Ignore: some browsers require a service worker registration to notify.
    }
  },
  async scheduleDailyReminders() {
    // Web uses the foreground timer fallback in ReminderScheduler.
  },
}
