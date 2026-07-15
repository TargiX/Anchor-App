export type CloudSyncPhase =
  | "inactive"
  | "initial-sync"
  | "saving"
  | "saved"
  | "error"

export interface CloudSyncSnapshot {
  phase: CloudSyncPhase
  userId: string | null
}

export interface CloudSyncSession {
  readonly id: number
  readonly userId: string
}

const INACTIVE_SNAPSHOT: CloudSyncSnapshot = {
  phase: "inactive",
  userId: null,
}

export function createCloudSyncStatusController() {
  let snapshot = INACTIVE_SNAPSHOT
  let nextSessionId = 0
  let currentSession: CloudSyncSession | null = null
  const listeners = new Set<() => void>()

  function publish(next: CloudSyncSnapshot) {
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
      publish({ phase: "initial-sync", userId })
      return session
    },
    isCurrent(session: CloudSyncSession) {
      return currentSession?.id === session.id
    },
    update(
      session: CloudSyncSession,
      phase: Exclude<CloudSyncPhase, "inactive">
    ) {
      if (currentSession?.id !== session.id) return false
      publish({ phase, userId: session.userId })
      return true
    },
    end(session?: CloudSyncSession) {
      if (session && currentSession?.id !== session.id) return false
      currentSession = null
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

      if (pending !== undefined) {
        await flush()
      } else {
        status.update(session, "error")
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
    flush,
    dispose() {
      disposed = true
      pending = undefined
    },
  }
}

export const cloudSyncStatus = createCloudSyncStatusController()
