"use client"

import { useSyncExternalStore } from "react"
import { capacitorNotificationAdapter } from "./native"
import {
  webNotificationAdapter,
  type DailyReminderConfig,
  type NotificationMode,
  type NotificationPort,
  type PermissionState,
} from "./port"

/**
 * Active notification adapter + a small reactive permission signal so the
 * UI (status in Settings) and the scheduler stay in sync after the user
 * grants/denies. Same `useSyncExternalStore` pattern as the data store.
 */
const port: NotificationPort = capacitorNotificationAdapter.isSupported()
  ? capacitorNotificationAdapter
  : webNotificationAdapter

let permission: PermissionState = port.getPermission()
const listeners = new Set<() => void>()

function emit(nextPermission = port.getPermission()) {
  permission = nextPermission
  listeners.forEach((listener) => listener())
}

void refreshPermission()

export function getNotificationMode(): NotificationMode {
  return port.mode
}

export function isNativeNotificationScheduler(): boolean {
  return port.mode === "native" && Boolean(port.scheduleDailyReminders)
}

export function isSupported(): boolean {
  return port.isSupported()
}

export async function refreshPermission(): Promise<PermissionState> {
  const result = port.refreshPermission
    ? await port.refreshPermission()
    : port.getPermission()
  emit(result)
  return result
}

export async function requestPermission(): Promise<PermissionState> {
  const result = await port.requestPermission()
  emit(result)
  return result
}

export function notify(title: string, options?: { body?: string }): void {
  port.notify(title, options)
}

export async function scheduleDailyReminders(
  reminders: DailyReminderConfig
): Promise<void> {
  await port.scheduleDailyReminders?.(reminders)
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
