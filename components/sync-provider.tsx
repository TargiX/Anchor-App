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
  resetAnonSlot,
  setCloudPersistence,
  setStorageScope,
} from "@/lib/store/store"
import { INITIAL_STATE, type AppState } from "@/lib/store/state"

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
      // Wipe any previous anon visitor's local progress so the current
      // visitor starts fresh on shared devices. Then switch to the anon
      // scope (a no-op if already there, but resets the hydrated guard so
      // the next hydrateFromStorage() reads the wiped slot). Anon progress
      // for THIS visitor is captured later if they sign in within the
      // same tab — see the authed branch below.
      resetAnonSlot()
      setStorageScope("anon")
      hydrateFromStorage()
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        clearCloudPersistence()
      }
    }

    if (status !== "authed" || !userId) return

    // Authed path: snapshot anon state (if any) BEFORE switching scopes —
    // setStorageScope resets in-memory state to INITIAL_STATE, so reading
    // getSnapshot() after would yield nothing.
    const anonProgress = getSnapshot()
    const hadAnonEntries =
      anonProgress !== INITIAL_STATE &&
      Object.keys(anonProgress.entries).length > 0

    setStorageScope("authed", userId)
    hydrateFromStorage()
    const localState = getSnapshot()

    let cancelled = false

    async function syncInitialState() {
      if (!userId) return

      const remoteState = await loadCloudState(client, userId)
      if (cancelled) return

      let syncedState: AppState = remoteState
        ? mergeCloudState(localState, remoteState)
        : localState

      // If the visitor had unsynced anon entries, fold them into the
      // synced authed state. mergeCloudState already prefers local
      // entries, but here `localState` is the authed-slot read (which
      // may be INITIAL_STATE on a fresh device) so we explicitly carry
      // the anon entries forward.
      if (hadAnonEntries) {
        syncedState = {
          ...syncedState,
          entries: {
            ...anonProgress.entries,
            ...syncedState.entries,
          },
        }
      }

      replaceState(syncedState, { persistCloud: false })
      // Persist anon progress so future hydrations within the same
      // browser see it; cloud sync follows on the schedule below.
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
