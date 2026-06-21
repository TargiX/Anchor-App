"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase/client"
import { loadCloudState, mergeCloudState, saveCloudState } from "@/lib/store/cloud"
import {
  clearCloudPersistence,
  getSnapshot,
  hydrateFromStorage,
  replaceState,
  setCloudPersistence,
} from "@/lib/store/store"

const SAVE_DELAY_MS = 650

export function SyncProvider() {
  const { status, user } = useAuth()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userId = user?.id ?? null

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    clearCloudPersistence()

    if (status === "anon") {
      // Local-first: keep the visitor's localStorage progress so a later
      // sign-in/sign-up can merge it into the cloud (see mergeCloudState,
      // which prefers local entries). No cloud persistence for anon.
      hydrateFromStorage()
      return
    }

    if (status !== "authed" || !userId) return

    let cancelled = false

    async function syncInitialState() {
      if (!userId) return

      hydrateFromStorage()
      const localState = getSnapshot()
      const remoteState = await loadCloudState(client, userId)
      if (cancelled) return

      const syncedState = remoteState
        ? mergeCloudState(localState, remoteState)
        : localState

      replaceState(syncedState, { persistCloud: false })
      await saveCloudState(client, userId, syncedState)
      if (cancelled) return

      setCloudPersistence((nextState) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          void saveCloudState(client, userId, nextState)
        }, SAVE_DELAY_MS)
      })
    }

    void syncInitialState().catch((error) => {
      console.error("Anchor cloud sync failed", error)
    })

    return () => {
      cancelled = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      clearCloudPersistence()
    }
  }, [status, userId])

  return null
}
