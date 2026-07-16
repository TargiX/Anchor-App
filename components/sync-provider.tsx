"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { supabase } from "@/lib/supabase/client"
import {
  createCloudInboundSync,
  loadCloudState,
  mergeCloudState,
  saveCloudState,
} from "@/lib/store/cloud"
import {
  cloudSyncStatus,
  createCloudSaveCoordinator,
} from "@/lib/store/sync-status"
import {
  clearAllAuthedSlots,
  clearAuthedSlot,
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
  const previousStatusRef = useRef<typeof status | null>(null)
  // Remember the previous authed user id so an authed → anon/unconfigured
  // transition can wipe that user's local slot on its way out. Without
  // this the local journal persists forever after sign-out on a shared
  // device.
  const previousAuthedUserIdRef = useRef<string | null>(null)
  const userId = user?.id ?? null

  useEffect(() => {
    const client = supabase
    const previousStatus = previousStatusRef.current
    previousStatusRef.current = status

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    clearCloudPersistence()
    cloudSyncStatus.end()

    // Unconfigured (no Supabase env) is a fully-supported local-only mode:
    // local persistence must work even though there is no cloud to sync to.
    // Use a local-only scope so legacy local data can migrate without being
    // treated as anonymous sign-in progress for a future cloud account.
    if (status === "unconfigured") {
      const prevUserId = previousAuthedUserIdRef.current
      if (prevUserId) clearAuthedSlot(prevUserId)
      else clearAllAuthedSlots()
      previousAuthedUserIdRef.current = null
      setStorageScope("local")
      hydrateFromStorage()
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        clearCloudPersistence()
      }
    }

    if (status === "anon") {
      // Wipe the previous authed user's local slot on sign-out so private
      // journal data does not survive a logout on a shared device.
      const prevUserId = previousAuthedUserIdRef.current
      if (prevUserId) clearAuthedSlot(prevUserId)
      else clearAllAuthedSlots()
      previousAuthedUserIdRef.current = null
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

    if (!client) return
    const configuredClient = client
    const authenticatedUserId = userId

    const syncSession = cloudSyncStatus.begin(authenticatedUserId)

    // Cross-account guard: if a different authed user was previously
    // active in this tab/session, wipe their local slot before we touch
    // any state. Without this an authed -> authed (A -> B) transition
    // that bypasses an intermediate anon render would read A's state as
    // "anon progress" and merge it into B's cloud row on the next save.
    const prevUserId = previousAuthedUserIdRef.current
    if (prevUserId && prevUserId !== userId) {
      clearAuthedSlot(prevUserId)
    }

    // Authed path: snapshot true anonymous same-tab state (if any) BEFORE
    // switching scopes — setStorageScope resets in-memory state to
    // INITIAL_STATE, so reading getSnapshot() after would yield nothing.
    // Do not carry `unconfigured` local-only legacy data into cloud auth:
    // the old pre-scope key had no account binding and may be unowned.
    const anonProgress = getSnapshot()
    const hadAnonEntries =
      previousStatus === "anon" &&
      anonProgress !== INITIAL_STATE &&
      Object.keys(anonProgress.entries).length > 0

    setStorageScope("authed", userId)
    hydrateFromStorage()
    previousAuthedUserIdRef.current = userId

    let cancelled = false
    let inboundSync: ReturnType<typeof createCloudInboundSync> | null = null
    const saveCoordinator = createCloudSaveCoordinator<AppState>({
      session: syncSession,
      status: cloudSyncStatus,
      save: (nextState) =>
        saveCloudState(configuredClient, authenticatedUserId, nextState),
      onError: (error) => {
        console.error("Anchor cloud persistence failed", error)
      },
    })

    function installCloudPersistence() {
      if (cancelled || !cloudSyncStatus.isCurrent(syncSession)) return

      setCloudPersistence((nextState) => {
        if (!saveCoordinator.schedule(nextState)) return
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null
          void saveCoordinator.flush()
        }, SAVE_DELAY_MS)
      })
    }

    function installInboundSync(initialCloudState: AppState) {
      if (
        inboundSync ||
        cancelled ||
        !cloudSyncStatus.isCurrent(syncSession)
      ) {
        return
      }

      inboundSync = createCloudInboundSync({
        client: configuredClient,
        userId: authenticatedUserId,
        initialCloudState,
        getLocalState: getSnapshot,
        replaceLocalState: replaceState,
        isActive: () =>
          !cancelled && cloudSyncStatus.isCurrent(syncSession),
        onError: (error) => {
          // Realtime is an optional freshness layer. Keep its failures out of
          // the visible save status; ordinary load/save continues to work.
          console.error("Anchor realtime sync failed", error)
        },
        onStateApplied: (reconciledState) => {
          saveCoordinator.rebasePending(reconciledState)
        },
      })
      inboundSync.start()
    }

    async function syncInitialState() {
      let remoteState: AppState | null
      try {
        remoteState = await loadCloudState(
          configuredClient,
          authenticatedUserId
        )
      } catch (error) {
        if (!cancelled && cloudSyncStatus.isCurrent(syncSession)) {
          console.error("Anchor cloud sync failed", error)
          cloudSyncStatus.update(syncSession, "error")
          installCloudPersistence()
          installInboundSync(INITIAL_STATE)
        }
        return
      }
      if (cancelled || !cloudSyncStatus.isCurrent(syncSession)) return

      // Re-read after the async cloud load so local edits made while the
      // request was in flight are not overwritten by a stale pre-await snapshot.
      const currentLocalState = getSnapshot()
      let syncedState: AppState = remoteState
        ? mergeCloudState(currentLocalState, remoteState)
        : currentLocalState

      // If the visitor had unsynced anon entries from this same tab/session,
      // fold them into the synced authed state. Anon edits are the freshest
      // data the user has, so they win on conflicting keys.
      if (hadAnonEntries) {
        syncedState = {
          ...syncedState,
          entries: {
            ...syncedState.entries,
            ...anonProgress.entries,
          },
        }
      }

      replaceState(syncedState, { persistCloud: false })
      try {
        await saveCloudState(configuredClient, authenticatedUserId, syncedState)
      } catch (error) {
        if (!cancelled && cloudSyncStatus.isCurrent(syncSession)) {
          console.error("Anchor initial cloud persistence failed", error)
          cloudSyncStatus.update(syncSession, "error")
          installCloudPersistence()
          installInboundSync(remoteState ?? INITIAL_STATE)
          if (saveCoordinator.schedule(getSnapshot())) {
            void saveCoordinator.flush()
          }
        }
        return
      }
      if (cancelled || !cloudSyncStatus.isCurrent(syncSession)) return

      installCloudPersistence()
      installInboundSync(syncedState)

      // A local edit can land while the initial cloud write is in flight,
      // before cloud persistence has been installed. Queue that fresher
      // snapshot now so "saved" never describes an older cloud value.
      const latestLocalState = getSnapshot()
      if (latestLocalState !== syncedState) {
        saveCoordinator.schedule(latestLocalState)
        void saveCoordinator.flush()
      } else {
        cloudSyncStatus.update(syncSession, "saved")
      }
    }

    void syncInitialState().catch((error) => {
      if (!cancelled && cloudSyncStatus.isCurrent(syncSession)) {
        console.error("Anchor cloud sync failed", error)
        cloudSyncStatus.update(syncSession, "error")
        installCloudPersistence()
      }
    })

    return () => {
      cancelled = true
      inboundSync?.dispose()
      saveCoordinator.dispose()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      clearCloudPersistence()
      cloudSyncStatus.end(syncSession)
    }
  }, [status, userId])

  return null
}
