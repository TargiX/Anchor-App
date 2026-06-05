/**
 * Storage boundary. The store talks to this port, never to `localStorage`
 * directly. Swapping in Capacitor Preferences / SQLite for the native build
 * means providing another adapter here — the store code does not change.
 */
export interface StoragePort {
  read(key: string): string | null
  write(key: string, value: string): void
  remove(key: string): void
}

/** Web adapter. SSR-safe and never throws (private mode, quota, etc.). */
export const localStorageAdapter: StoragePort = {
  read(key) {
    if (typeof window === "undefined") return null
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  write(key, value) {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Ignore: storage unavailable / over quota. In-memory state still works.
    }
  },
  remove(key) {
    if (typeof window === "undefined") return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Ignore.
    }
  },
}
