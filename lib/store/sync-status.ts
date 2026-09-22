export type CloudSyncPhase =
  | "inactive"
  | "initial-sync"
  | "saving"
  | "saved"
  | "error"
  | "offline"

/** An entry that differed on device and cloud at reconciliation time. */
export interface CloudSyncConflict {
  /** Local calendar day of the diverging entry, `YYYY-MM-DD`. */
  dayKey: string
  /** ISO instant the divergence was observed. */
  detectedAt: string
}

export interface CloudSyncSnapshot {
  phase: CloudSyncPhase
  userId: string | null
  /** Local ISO instant of the last confirmed successful cloud round-trip. */
  lastSyncedAt: string | null
  /** Entries both sides changed since this signed-in session began. */
  conflictCount: number
  lastConflict: CloudSyncConflict | null
}

export interface CloudSyncSession {
  readonly id: number
  readonly userId: string
}

const INACTIVE_SNAPSHOT: CloudSyncSnapshot = {
  phase: "inactive",
  userId: null,
  lastSyncedAt: null,
  conflictCount: 0,
  lastConflict: null,
}

/**
 * A fetch that never reached the server (airplane mode, DNS, TLS) rejects
 * with TypeError across every runtime we ship (web + Capacitor). Server-side
 * rejections (4xx/5xx) arrive as plain Errors, so this is the offline/error
 * fork for the visible status.
 */
export function isNetworkFailure(error: unknown): boolean {
  return error instanceof TypeError
}

export function createCloudSyncStatusController() {
  let snapshot = INACTIVE_SNAPSHOT
  let nextSessionId = 0
  let currentSession: CloudSyncSession | null = null
  // "offline" after a failed WRITE means unsaved work may still exist, so a
  // later successful read must not quiet the status; "offline" from a failed
  // read means only freshness was lost, and any confirmed contact recovers.
  let offlineFromFailedSave = false
  const listeners = new Set<() => void>()

  function publish(next: CloudSyncSnapshot) {
    if (next.phase !== "offline") offlineFromFailedSave = false
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot() {
      return snapshot
    },
    getServerSnapshot() {
      return INACTIVE_SNAPSHOT
    },
    begin(userId: string): CloudSyncSession {
      const session = { id: ++nextSessionId, userId }
      currentSession = session
      offlineFromFailedSave = false
      publish({
        phase: "initial-sync",
        userId,
        lastSyncedAt: null,
        conflictCount: 0,
        lastConflict: null,
      })
      return session
    },
    isCurrent(session: CloudSyncSession) {
      return currentSession?.id === session.id
    },
    update(
      session: CloudSyncSession,
      phase: Exclude<CloudSyncPhase, "inactive" | "offline">,
      details: { lastSyncedAt?: string | null } = {}
    ) {
      if (currentSession?.id !== session.id) return false
      // "saved" is only ever published from a confirmed write, so it always
      // refreshes the freshness stamp; every other phase keeps the last one.
      const lastSyncedAt =
        details.lastSyncedAt ??
        (phase === "saved" ? new Date().toISOString() : snapshot.lastSyncedAt)
      publish({
        phase,
        userId: session.userId,
        lastSyncedAt,
        conflictCount: snapshot.conflictCount,
        lastConflict: snapshot.lastConflict,
      })
      return true
    },
    /** A cloud request failed without reaching the server. */
    markOffline(
      session: CloudSyncSession,
      reason: "save-failed" | "unreachable"
    ) {
      if (currentSession?.id !== session.id) return false
      offlineFromFailedSave = reason === "save-failed"
      publish({
        phase: "offline",
        userId: session.userId,
        lastSyncedAt: snapshot.lastSyncedAt,
        conflictCount: snapshot.conflictCount,
        lastConflict: snapshot.lastConflict,
      })
      return true
    },
    /** A cloud read confirmed the backend is reachable again. */
    noteCloudContact(session: CloudSyncSession) {
      if (currentSession?.id !== session.id) return false
      const lastSyncedAt = new Date().toISOString()
      if (snapshot.phase === "offline" && !offlineFromFailedSave) {
        publish({
          phase: "saved",
          userId: session.userId,
          lastSyncedAt,
          conflictCount: snapshot.conflictCount,
          lastConflict: snapshot.lastConflict,
        })
        return true
      }
      publish({ ...snapshot, lastSyncedAt })
      return true
    },
    /** Entries that diverged on device and cloud, from reconciliation. */
    recordConflicts(
      session: CloudSyncSession,
      conflicts: readonly CloudSyncConflict[]
    ) {
      if (conflicts.length === 0 || currentSession?.id !== session.id) {
        return false
      }
      publish({
        ...snapshot,
        conflictCount: snapshot.conflictCount + conflicts.length,
        lastConflict: conflicts[conflicts.length - 1]!,
      })
      return true
    },
    end(session?: CloudSyncSession) {
      if (session && currentSession?.id !== session.id) return false
      currentSession = null
      offlineFromFailedSave = false
      publish(INACTIVE_SNAPSHOT)
      return true
    },
  }
}

export type CloudSyncStatusController = ReturnType<
  typeof createCloudSyncStatusController
>

interface CloudSaveCoordinatorOptions<State> {
  session: CloudSyncSession
  status: CloudSyncStatusController
  save: (state: State) => Promise<void>
  onError?: (error: unknown) => void
}

/**
 * Runs at most one cloud write at a time and coalesces edits made while a write
 * is in flight. This prevents an older request from landing after a newer one
 * and overwriting it. Failed writes are not terminal: a later schedule/flush
 * pair retries with the latest local state.
 */
export function createCloudSaveCoordinator<State>({
  session,
  status,
  save,
  onError,
}: CloudSaveCoordinatorOptions<State>) {
  let pending: State | undefined
  let inFlight = false
  let disposed = false

  async function flush(): Promise<void> {
    if (disposed || inFlight || pending === undefined) return

    const state = pending
    pending = undefined
    inFlight = true

    try {
      await save(state)
      inFlight = false
      if (disposed || !status.isCurrent(session)) return

      if (pending !== undefined) {
        await flush()
      } else {
        status.update(session, "saved")
      }
    } catch (error) {
      inFlight = false
      if (disposed || !status.isCurrent(session)) return
      onError?.(error)

      // A write that never reached the server is an offline condition, not
      // a backend error; the message shown to the user differs accordingly.
      const newerPending = pending !== undefined
      if (isNetworkFailure(error)) {
        status.markOffline(session, "save-failed")
        // Keep the failed state so a later confirmed contact can retry it —
        // without this the last write before going offline is lost until the
        // user happens to edit again. A newer edit already queued flushes now.
        if (!newerPending) pending = state
      } else {
        status.update(session, "error")
      }

      if (newerPending) {
        await flush()
      }
    }
  }

  return {
    schedule(state: State) {
      if (disposed || !status.isCurrent(session)) return false
      pending = state
      status.update(session, "saving")
      return true
    },
    rebasePending(state: State) {
      if (
        disposed ||
        !status.isCurrent(session) ||
        (!inFlight && pending === undefined)
      ) {
        return false
      }

      pending = state
      return true
    },
    flush,
    /**
     * Retries a write retained after a network failure. Called when a cloud
     * read confirms the backend is reachable again.
     */
    retryPending() {
      if (disposed || !status.isCurrent(session) || pending === undefined) {
        return false
      }
      status.update(session, "saving")
      void flush()
      return true
    },
    dispose() {
      disposed = true
      pending = undefined
    },
  }
}

export const cloudSyncStatus = createCloudSyncStatusController()
