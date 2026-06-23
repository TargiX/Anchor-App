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
  setStorageScope,
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
      // Switch the storage scope to the anon slot. setStorageScope wipes the
      // previously-active slot (e.g. the prior authed user's data) so a fresh
      // anonymous visitor can never see the previous user's rituals. The anon
      // slot keeps this visitor's own progress for later cloud merge.
      setStorageScope("anon")
      hydrateFromStorage()
      return
    }

    if (status !== "authed" || !userId) return

    setStorageScope("authed")
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
