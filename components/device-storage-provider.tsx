"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Capacitor, registerPlugin } from "@capacitor/core"
import {
  createNativeStorage,
  type NativeJournalPort,
} from "@/lib/store/native-storage"
import { localStorageAdapter } from "@/lib/store/persistence"
import { installDeviceStorage } from "@/lib/store/store"

let initialization: Promise<void> | undefined
let retryWrite: (() => Promise<boolean>) | undefined
const listeners = new Set<(status: string) => void>()
let currentStatus = "saved"
function report(status: string) {
  currentStatus = status
  listeners.forEach((listener) => listener(status))
}

function initialize() {
  if (!initialization) {
    initialization = (async () => {
      if (Capacitor.getPlatform() !== "ios") return
      const disk = registerPlugin<NativeJournalPort>("AnchorJournal")
      const adapter = await createNativeStorage(
        disk,
        {
          ...localStorageAdapter,
          // Migration must distinguish inaccessible storage from an empty journal.
          read: (key) => window.localStorage.getItem(key),
          keys: () => Object.keys(window.localStorage),
        },
        report
      )
      retryWrite = adapter.retry
      installDeviceStorage(adapter.storage, adapter.flush)
    })().catch((error) => {
      initialization = undefined
      throw error
    })
  }
  return initialization
}

export function DeviceStorageProvider({ children }: { children: ReactNode }) {
  if (process.env.NEXT_PUBLIC_NATIVE_BUILD !== "true") return children
  return <NativeStorageGate>{children}</NativeStorageGate>
}

function NativeStorageGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState(currentStatus)
  useEffect(() => {
    let active = true
    listeners.add(setStatus)
    initialize()
      .then(() => {
        if (active) setReady(true)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
      listeners.delete(setStatus)
    }
  }, [attempt])
  if (!ready)
    return (
      <main className="mx-auto max-w-md px-6 py-24" role="status">
        <h1 className="text-2xl">
          {failed
            ? "Your journal couldn’t be opened."
            : "Opening your journal…"}
        </h1>
        {failed && (
          <>
            <p className="my-4">
              Your saved data has not been replaced. Unlock your device and try
              again.
            </p>
            <button
              className="min-h-12 underline"
              onClick={() => {
                setFailed(false)
                setAttempt((value) => value + 1)
              }}
            >
              Try again
            </button>
          </>
        )}
      </main>
    )
  return (
    <>
      {status === "error" && (
        <aside
          role="alert"
          className="fixed inset-x-0 bottom-0 z-50 border bg-background p-5 pb-10 shadow-lg"
        >
          <p>
            Recent changes haven’t been saved on this device. Keep Anchor open
            and try again.
          </p>
          <button
            className="min-h-12 underline"
            onClick={() => {
              void retryWrite?.()
            }}
          >
            Retry saving
          </button>
        </aside>
      )}
      {children}
    </>
  )
}
