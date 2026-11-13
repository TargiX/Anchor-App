import { apiFetch } from "@/lib/backend/client"
import {
  AppStateSchema,
  INITIAL_STATE,
  migrate,
  type AppState,
} from "@/lib/store/state"

/**
 * Transport seam between the store and the Anchor backend. The backend scopes
 * every query to the authenticated session, so the transport carries no
 * user id — only the state payload and optimistic-concurrency base version.
 */
export interface CloudStateSnapshot {
  state: AppState | null
  updatedAt: string | null
}

export interface CloudSaveResult {
  updatedAt: string | null
  /** True when the server row was newer than our base; the write was
   *  superseded and inbound reconciliation owns convergence. */
  conflict: boolean
}

export interface CloudTransport {
  load(): Promise<CloudStateSnapshot>
  save(state: AppState): Promise<CloudSaveResult>
  /** Cheap version probe used by inbound polling. */
  version(): Promise<string | null>
  /** Server version this client has last written or observed. */
  readonly lastVersion: string | null
}

const DEFAULT_POLL_INTERVAL_MS = 30_000

interface CloudInboundSyncOptions {
  transport: CloudTransport
  initialBaselineState: AppState | null
  getLocalState: () => AppState
  replaceLocalState: (state: AppState, options: { persistCloud: false }) => void
  isActive: () => boolean
  pollIntervalMs?: number
  onError?: (error: unknown) => void
  /** A cloud request succeeded — the backend is reachable. */
  onContact?: () => void
  /** Local entries that diverged from both baseline and remote on reconcile. */
  onConflicts?: (dayKeys: readonly string[]) => void
  onStateApplied?: (state: AppState) => void
  onRecoverySaveNeeded?: (state: AppState) => void
  /**
   * True while local habits came from invalid-container recovery (see
   * `localHabitsFromInvalidRecovery`). Recovered habits are "unknown",
   * not an intentional deletion, so remote habits win the merge.
   */
  localHabitsUnknown?: () => boolean
}

/**
 * HTTP transport over the backend's /api/data/state routes. `lastVersion`
 * tracks the newest server version this client wrote or observed, which is
 * both the optimistic-concurrency base for saves and the self-echo filter
 * for polling: a version() result equal to lastVersion is our own write.
 */
export function createHttpTransport(
  fetcher: typeof apiFetch = apiFetch
): CloudTransport {
  let lastVersion: string | null = null

  return {
    get lastVersion() {
      return lastVersion
    },

    /**
     * Fetch the cloud row and migrate its payload to the current state
     * shape; remember the row version for self-echo filtering.
     */
    async load() {
      const res = await fetcher("/api/data/state")
      if (!res.ok) throw new Error(`Cloud load failed (${res.status})`)
      const body = (await res.json()) as {
        state: unknown
        updatedAt?: string | null
      }
      lastVersion = body.updatedAt ?? null
      return {
        state: body.state == null ? null : migrate(body.state),
        updatedAt: lastVersion,
      }
    },

    /**
     * Write the state to the cloud row; a 409 reports a conflict without
     * adopting the server version, so inbound reconciliation pulls it.
     */
    async save(state) {
      const safeState = AppStateSchema.parse(state)
      const res = await fetcher("/api/data/state", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          state: safeState,
          baseUpdatedAt: lastVersion ?? undefined,
        }),
      })
      if (res.status === 409) {
        // Do not adopt the server's version: the next version() probe must
        // still see the row as remote-newer so inbound reconciliation pulls
        // it. The recovery save then converges with the fresh base.
        return { updatedAt: lastVersion, conflict: true }
      }
      if (!res.ok) throw new Error(`Cloud save failed (${res.status})`)
      const body = (await res.json()) as { updatedAt?: string | null }
      lastVersion = body.updatedAt ?? lastVersion
      return { updatedAt: lastVersion, conflict: false }
    },

    /**
     * Probe the row's updatedAt without downloading the payload.
     */
    async version() {
      const res = await fetcher("/api/data/state/version")
      if (!res.ok) throw new Error(`Cloud version check failed (${res.status})`)
      const body = (await res.json()) as { updatedAt?: string | null }
      return body.updatedAt ?? null
    },
  }
}

/**
 * Three-way-lite merge for the first contact with the cloud (no
 * baseline yet): local entries win per key, unknown/recovered habits
 * defer to remote, defaults-only notification settings adopt remote.
 */
export function mergeCloudState(
  local: AppState,
  remote: AppState,
  localHabitsUnknown = false
): AppState {
  const weeklyDirection = local.weeklyDirection ?? remote.weeklyDirection
  return {
    entries: { ...remote.entries, ...local.entries },
    habits:
      localHabitsUnknown || !hasCustomHabits(local)
        ? remote.habits
        : local.habits,
    notificationMorning:
      local.notificationMorning === INITIAL_STATE.notificationMorning
        ? remote.notificationMorning
        : local.notificationMorning,
    notificationEvening:
      local.notificationEvening === INITIAL_STATE.notificationEvening
        ? remote.notificationEvening
        : local.notificationEvening,
    ...(weeklyDirection ? { weeklyDirection } : {}),
  }
}

/**
 * Polls the backend's version endpoint as an invalidation signal. The row is
 * always reloaded through the transport's migration boundary, then reconciled
 * against the last observed cloud baseline and a post-await local snapshot.
 * Until a cloud-confirmed baseline exists, the initial local-wins merge keeps
 * potentially unsynced hydrated work. Local values that later diverge from a
 * known baseline remain pending work.
 */
export function createCloudInboundSync({
  transport,
  initialBaselineState,
  getLocalState,
  replaceLocalState,
  isActive,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  onError,
  onContact,
  onConflicts,
  onStateApplied,
  onRecoverySaveNeeded,
  localHabitsUnknown: localHabitsUnknownFn,
}: CloudInboundSyncOptions) {
  let disposed = false
  let started = false
  let refreshRequested = false
  let refreshPromise: Promise<void> | null = null
  let cloudBaseline = initialBaselineState
  let pollTimer: ReturnType<typeof setInterval> | null = null

  /**
   * Drain pending refresh requests serially, reconciling each fresh
   * remote load against the post-await local snapshot.
   */
  function refresh(): Promise<void> {
    if (disposed || !isActive()) return Promise.resolve()

    refreshRequested = true
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      while (refreshRequested && !disposed && isActive()) {
        refreshRequested = false

        let remoteState: AppState | null
        try {
          const snapshot = await transport.load()
          remoteState = snapshot.state
        } catch (error) {
          if (!disposed && isActive()) onError?.(error)
          continue
        }
        if (disposed || !isActive()) continue
        onContact?.()

        const currentLocalState = getLocalState()
        const previousBaseline = cloudBaseline
        const baselineWasUnknown = previousBaseline === null
        const observedRemoteState = remoteState ?? INITIAL_STATE
        // Read once per refresh: recovered habits are "unknown", not an
        // intentional deletion, so remote habits win this reconcile.
        const localHabitsUnknown = localHabitsUnknownFn?.() ?? false
        const reconciledState = !baselineWasUnknown
          ? reconcileInboundCloudState(
              currentLocalState,
              previousBaseline,
              observedRemoteState,
              onConflicts,
              localHabitsUnknown
            )
          : mergeCloudState(
              currentLocalState,
              observedRemoteState,
              localHabitsUnknown
            )
        const recoverySaveNeeded = !structurallyEqual(
          observedRemoteState,
          reconciledState
        )
        // Even while the merged recovery state is still being persisted, the
        // observed row is the comparison baseline. Otherwise a missed self-echo
        // would make a later remote update look like another first recovery and
        // allow inherited local values to overwrite it.
        cloudBaseline = observedRemoteState
        // Apply also when the merged state is structurally equal but local
        // habits are still recovered-unknown: replaceLocalState routes through
        // the reconciliation path that clears the recovery marker, so normal
        // cloud persistence resumes for later edits instead of every push
        // being deferred through the recovery-save lane.
        if (
          !structurallyEqual(currentLocalState, reconciledState) ||
          localHabitsUnknown
        ) {
          replaceLocalState(reconciledState, { persistCloud: false })
          onStateApplied?.(reconciledState)
        }
        // Keep retrying protected local work until a refetch confirms that the
        // reconciled state reached the row. The save callback may fail without
        // rejecting, so cloud observation is the durable acknowledgement.
        if (recoverySaveNeeded) {
          onRecoverySaveNeeded?.(reconciledState)
        }
      }
    })().finally(() => {
      refreshPromise = null
      if (refreshRequested && !disposed && isActive()) void refresh()
    })

    return refreshPromise
  }

  /**
   * Version poll: trigger a refresh only when the remote row was
   * written by another session (version differs from lastVersion).
   */
  async function checkForRemoteChanges() {
    if (disposed || !isActive()) return
    try {
      const remoteVersion = await transport.version()
      onContact?.()
      // lastVersion is bumped by our own loads and saves, so a mismatch
      // means another session wrote the row.
      if (remoteVersion !== transport.lastVersion) {
        void refresh()
      }
    } catch (error) {
      if (!disposed && isActive()) onError?.(error)
    }
  }

  /**
   * Catch up on tab focus so a backgrounded session syncs promptly.
   */
  function onVisibilityChange() {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      void checkForRemoteChanges()
    }
  }

  return {
    /**
     * Begin version polling, focus checks and the initial reconcile.
     * Idempotent; a second start is ignored.
     */
    start() {
      if (started || disposed || !isActive()) return
      started = true

      pollTimer = setInterval(() => {
        void checkForRemoteChanges()
      }, pollIntervalMs)
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", onVisibilityChange)
      }
      // Initial reconcile: recovers anything missed while the app was closed.
      void refresh()
    },
    refresh,
    /**
     * Stop polling and detach listeners; in-flight refresh loops exit on
     * their next guard check.
     */
    dispose() {
      disposed = true
      refreshRequested = false
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange)
      }
    },
  }
}

/**
 * Three-way reconcile against the last observed cloud baseline: local
 * wins divergences, remote wins fields local left untouched, local
 * deletions are honoured, and diverging days are reported via
 * onConflicts. Recovered-unknown local habits never win.
 */
function reconcileInboundCloudState(
  local: AppState,
  baseline: AppState,
  remote: AppState,
  onConflicts?: (dayKeys: readonly string[]) => void,
  localHabitsUnknown = false
): AppState {
  const mergedEntries = { ...remote.entries }
  const conflicts: string[] = []
  for (const [dayKey, localEntry] of Object.entries(local.entries)) {
    const baselineEntry = baseline.entries[dayKey]
    const remoteEntry = remote.entries[dayKey]
    if (structurallyEqual(localEntry, baselineEntry)) continue
    if (structurallyEqual(localEntry, remoteEntry)) continue
    // Local wins the merge; the day is still a divergence worth surfacing.
    if (!structurallyEqual(remoteEntry, baselineEntry)) conflicts.push(dayKey)
    mergedEntries[dayKey] = localEntry
  }
  // A locally deleted entry is absent from local.entries, so the loop above
  // never sees it. When the baseline had the entry, local deletion is itself
  // a local change and wins the merge the same way an edit does.
  for (const dayKey of Object.keys(baseline.entries)) {
    if (dayKey in local.entries) continue
    const remoteEntry = remote.entries[dayKey]
    // Remote also deleted → both sides agree, no divergence to report.
    if (remoteEntry !== undefined && !structurallyEqual(remoteEntry, baseline.entries[dayKey])) {
      conflicts.push(dayKey)
    }
    delete mergedEntries[dayKey]
  }
  if (conflicts.length > 0) onConflicts?.(conflicts)

  // Recovered-unknown local habits never win: remote habits stand until the
  // user makes an explicit local change (which clears the recovery flag).
  const habits = localHabitsUnknown
    ? remote.habits
    : structurallyEqual(local.habits, baseline.habits)
      ? remote.habits
      : local.habits
  const notificationMorning = structurallyEqual(
    local.notificationMorning,
    baseline.notificationMorning
  )
    ? remote.notificationMorning
    : local.notificationMorning
  const notificationEvening = structurallyEqual(
    local.notificationEvening,
    baseline.notificationEvening
  )
    ? remote.notificationEvening
    : local.notificationEvening
  const weeklyDirection = structurallyEqual(
    local.weeklyDirection,
    baseline.weeklyDirection
  )
    ? remote.weeklyDirection
    : local.weeklyDirection

  return {
    entries: mergedEntries,
    habits,
    notificationMorning,
    notificationEvening,
    ...(weeklyDirection ? { weeklyDirection } : {}),
  }
}

function hasCustomHabits(state: AppState): boolean {
  return JSON.stringify(state.habits) !== JSON.stringify(INITIAL_STATE.habits)
}

/**
 * Deep structural equality used to distinguish real edits from
 * reference-identical re-renders.
 */
function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (
    typeof left !== "object" ||
    typeof right !== "object" ||
    left === null ||
    right === null
  ) {
    return false
  }
  if (Array.isArray(left) !== Array.isArray(right)) return false

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false
    return left.every((value, index) => structurallyEqual(value, right[index]))
  }

  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord)
  const rightKeys = Object.keys(rightRecord)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(rightRecord, key) &&
      structurallyEqual(leftRecord[key], rightRecord[key])
  )
}
