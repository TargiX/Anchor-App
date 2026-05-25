/**
 * Notification boundary. The app talks to a `NotificationPort`, never to the
 * browser API directly — so the native build can swap in a Capacitor
 * (`@capacitor/local-notifications`) adapter without touching app code.
 */

export type PermissionState = "unsupported" | "default" | "granted" | "denied"

export interface NotificationPort {
  isSupported(): boolean
  getPermission(): PermissionState
  requestPermission(): Promise<PermissionState>
  /** Fire a notification immediately (used for the in-session scheduler + test). */
  notify(title: string, options?: { body?: string }): void
}

/**
 * Web adapter (Notification API).
 *
 * Honest limitation: the browser can only deliver these while a tab is open.
 * Reliable delivery when the app is closed needs push infrastructure or a
 * service worker with the Notification Triggers API — out of scope here. On
 * native, the Capacitor adapter schedules real OS-level local notifications.
 */
export const webNotificationAdapter: NotificationPort = {
  isSupported() {
    return typeof window !== "undefined" && "Notification" in window
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
}
