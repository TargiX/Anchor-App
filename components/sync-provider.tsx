"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase/client"
import { loadCloudState, mergeCloudState, saveCloudState } from "@/lib/store/cloud"
import {
  clearCloudPersistence,
  forceRehydrate,
  getSnapshot,
  hydrateFromStorage,
  replaceState,
  resetState,
  setCloudPersistence,
} from "@/lib/store/store"

const SAVE_DELAY_MS = 650

export function SyncProvider() {
  const { status, user } = useAuth()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousStatusRef = useRef<typeof status>(null)
  const userId = user?.id ?? null

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    clearCloudPersistence()

    const previousStatus = previousStatusRef.current
    previousStatusRef.current = status
    // authed → anon is a sign-out: wipe the previous user's persisted state
    // so the new anonymous visitor can't see the prior user's rituals.
    const isSignOut = previousStatus === "authed" && status === "anon"

    if (status === "anon") {
      if (isSignOut) {
        // First-anon-load is the safe path: keep visitor's local progress.
        // Sign-out must look like a fresh device to the next visitor.
        resetState()
        // hydrateFromStorage is a no-op after the first call in this tab; the
        // reset above already cleared localStorage, but flush the in-memory
        // "hydrated" guard too so a subsequent authed session re-hydrates.
        forceRehydrate()
      } else {
        // Local-first: keep the visitor's localStorage progress so a later
        // sign-in/sign-up can merge it into the cloud (see mergeCloudState,
        // which prefers local entries). No cloud persistence for anon.
        hydrateFromStorage()
      }
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
