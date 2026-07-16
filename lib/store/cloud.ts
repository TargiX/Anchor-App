import type { SupabaseClient } from "@supabase/supabase-js"
import {
  AppStateSchema,
  INITIAL_STATE,
  migrate,
  type AppState,
} from "@/lib/store/state"

const TABLE = "anchor_user_states"

interface AnchorStateRow {
  state: unknown
}

interface CloudInboundSyncOptions {
  client: SupabaseClient
  userId: string
  initialBaselineState: AppState | null
  getLocalState: () => AppState
  replaceLocalState: (
    state: AppState,
    options: { persistCloud: false }
  ) => void
  isActive: () => boolean
  loadState?: typeof loadCloudState
  onError?: (error: unknown) => void
  onStateApplied?: (state: AppState) => void
  onRecoverySaveNeeded?: (state: AppState) => void
}

export async function loadCloudState(
  client: SupabaseClient,
  userId: string
): Promise<AppState | null> {
  const { data, error } = await client
    .from(TABLE)
    .select("state")
    .eq("user_id", userId)
    .maybeSingle<AnchorStateRow>()

  if (error) throw error
  return data ? migrate(data.state) : null
}

export async function saveCloudState(
  client: SupabaseClient,
  userId: string,
  state: AppState
): Promise<void> {
  const safeState = AppStateSchema.parse(state)
  const { error } = await client.from(TABLE).upsert(
    {
      user_id: userId,
      state: safeState,
    },
    { onConflict: "user_id" }
  )

  if (error) throw error
}

export function mergeCloudState(local: AppState, remote: AppState): AppState {
  return {
    entries: { ...remote.entries, ...local.entries },
    habits: hasCustomHabits(local) ? local.habits : remote.habits,
    notificationMorning:
      local.notificationMorning === INITIAL_STATE.notificationMorning
        ? remote.notificationMorning
        : local.notificationMorning,
    notificationEvening:
      local.notificationEvening === INITIAL_STATE.notificationEvening
        ? remote.notificationEvening
        : local.notificationEvening,
  }
}

/**
 * Treats Realtime messages as invalidation notifications. The row is always
 * reloaded through loadCloudState's migration boundary, then reconciled
 * against the last observed cloud baseline and a post-await local snapshot.
 * Until a cloud-confirmed baseline exists, the initial local-wins merge keeps
 * potentially unsynced hydrated work. Local values that later diverge from a
 * known baseline remain pending work.
 */
export function createCloudInboundSync({
  client,
  userId,
  initialBaselineState,
  getLocalState,
  replaceLocalState,
  isActive,
  loadState = loadCloudState,
  onError,
  onStateApplied,
  onRecoverySaveNeeded,
}: CloudInboundSyncOptions) {
  let channel: ReturnType<SupabaseClient["channel"]> | null = null
  let disposed = false
  let started = false
  let refreshRequested = false
  let refreshPromise: Promise<void> | null = null
  let cloudBaseline = initialBaselineState

  function refresh(): Promise<void> {
    if (disposed || !isActive()) return Promise.resolve()

    refreshRequested = true
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      while (refreshRequested && !disposed && isActive()) {
        refreshRequested = false

        let remoteState: AppState | null
        try {
          remoteState = await loadState(client, userId)
        } catch (error) {
          if (!disposed && isActive()) onError?.(error)
          continue
        }
        if (disposed || !isActive()) continue

        const currentLocalState = getLocalState()
        const previousBaseline = cloudBaseline
        const baselineWasUnknown = previousBaseline === null
        const observedRemoteState = remoteState ?? INITIAL_STATE
        const reconciledState = !baselineWasUnknown
          ? reconcileInboundCloudState(
              currentLocalState,
              previousBaseline,
              observedRemoteState
            )
          : mergeCloudState(currentLocalState, observedRemoteState)
        const recoveryAlreadyPersisted =
          baselineWasUnknown &&
          structurallyEqual(observedRemoteState, reconciledState)
        if (!baselineWasUnknown || recoveryAlreadyPersisted) {
          cloudBaseline = observedRemoteState
        }
        if (!structurallyEqual(currentLocalState, reconciledState)) {
          replaceLocalState(reconciledState, { persistCloud: false })
          onStateApplied?.(reconciledState)
        }
        if (baselineWasUnknown && !recoveryAlreadyPersisted) {
          onRecoverySaveNeeded?.(reconciledState)
        }
      }
    })().finally(() => {
      refreshPromise = null
      if (refreshRequested && !disposed && isActive()) void refresh()
    })

    return refreshPromise
  }

  return {
    start() {
      if (started || disposed || !isActive()) return
      started = true

      try {
        channel = client
          .channel(`anchor-user-state:${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: TABLE,
              filter: `user_id=eq.${userId}`,
            },
            () => {
              void refresh()
            }
          )
          .subscribe((status) => {
            // This fires for the initial connection and again after reconnect.
            // Reconcile both times to recover notifications missed while away.
            if (status === "SUBSCRIBED") {
              void refresh()
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              if (!disposed && isActive()) {
                onError?.(new Error(`Anchor realtime channel ${status}`))
              }
            }
          })
      } catch (error) {
        channel = null
        if (!disposed && isActive()) onError?.(error)
      }
    },
    refresh,
    dispose() {
      disposed = true
      refreshRequested = false
      const activeChannel = channel
      channel = null
      if (activeChannel) {
        void Promise.resolve(client.removeChannel(activeChannel)).catch((error) => {
          onError?.(error)
        })
      }
    },
  }
}

function reconcileInboundCloudState(
  local: AppState,
  baseline: AppState,
  remote: AppState
): AppState {
  const entries: AppState["entries"] = {}
  const dates = new Set([
    ...Object.keys(baseline.entries),
    ...Object.keys(local.entries),
    ...Object.keys(remote.entries),
  ])

  for (const date of dates) {
    const localEntry = local.entries[date]
    const baselineEntry = baseline.entries[date]
    const entry = structurallyEqual(localEntry, baselineEntry)
      ? remote.entries[date]
      : localEntry
    if (entry !== undefined) entries[date] = entry
  }

  return {
    entries,
    habits: structurallyEqual(local.habits, baseline.habits)
      ? remote.habits
      : local.habits,
    notificationMorning: structurallyEqual(
      local.notificationMorning,
      baseline.notificationMorning
    )
      ? remote.notificationMorning
      : local.notificationMorning,
    notificationEvening: structurallyEqual(
      local.notificationEvening,
      baseline.notificationEvening
    )
      ? remote.notificationEvening
      : local.notificationEvening,
  }
}

function hasCustomHabits(state: AppState): boolean {
  return JSON.stringify(state.habits) !== JSON.stringify(INITIAL_STATE.habits)
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (
    typeof left !== "object" ||
    left === null ||
    typeof right !== "object" ||
    right === null
  ) {
    return false
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false
    return (
      left.length === right.length &&
      left.every((value, index) => structurallyEqual(value, right[index]))
    )
  }

  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord)
  const rightKeys = Object.keys(rightRecord)
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.hasOwn(rightRecord, key) &&
        structurallyEqual(leftRecord[key], rightRecord[key])
    )
  )
}
