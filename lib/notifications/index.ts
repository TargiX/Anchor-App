"use client"

import { useSyncExternalStore } from "react"
import {
  webNotificationAdapter,
  type NotificationPort,
  type PermissionState,
} from "./port"

/**
 * Active notification adapter + a small reactive permission signal so the
 * UI (status in Settings) and the scheduler stay in sync after the user
 * grants/denies. Same `useSyncExternalStore` pattern as the data store.
 */
const port: NotificationPort = webNotificationAdapter

let permission: PermissionState = port.getPermission()
const listeners = new Set<() => void>()

function emit() {
  permission = port.getPermission()
  listeners.forEach((listener) => listener())
}

export function isSupported(): boolean {
  return port.isSupported()
}

export async function requestPermission(): Promise<PermissionState> {
  const result = await port.requestPermission()
  emit()
  return result
}

export function notify(title: string, options?: { body?: string }): void {
  port.notify(title, options)
}

export function useNotificationPermission(): PermissionState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => permission,
    () => "default" as PermissionState
  )
}

export type { PermissionState }
