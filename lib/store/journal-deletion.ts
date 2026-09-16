import type { DeletedNote } from "./journal-editing"

export type DeletionStatus =
  | "saving"
  | "deleted"
  | "error"
  | "restoring"
  | "restore-error"
  | "restored"
  | "conflict"

/** Owned above the deleted row so errors and retries survive its unmount. */
export function createDeletionOperation(
  token: DeletedNote,
  ports: {
    flush: () => Promise<boolean>
    retry: () => Promise<boolean>
    undo: (token: DeletedNote) => boolean
    identity: () => string | null
  }
) {
  let status: DeletionStatus = "saving"
  let running = false
  let undone = false
  const listeners = new Set<() => void>()
  function publish(next: DeletionStatus) {
    status = next
    listeners.forEach((listener) => listener())
  }
  async function save(retry = false) {
    if (running || undone) return
    if (ports.identity() !== token.identity) {
      publish("conflict")
      return
    }
    running = true
    publish("saving")
    let success = false
    try {
      success = await (retry ? ports.retry() : ports.flush())
    } catch {
      /* Report through status. */
    }
    running = false
    publish(
      ports.identity() !== token.identity
        ? "conflict"
        : success
          ? "deleted"
          : "error"
    )
  }
  async function undo() {
    if (running) return
    if (ports.identity() !== token.identity) {
      publish("conflict")
      return
    }
    const retry = undone
    if (!undone && !ports.undo(token)) {
      publish("conflict")
      return
    }
    undone = true
    running = true
    publish("restoring")
    let success = false
    try {
      success = await (retry ? ports.retry() : ports.flush())
    } catch {
      /* Retain retry. */
    }
    running = false
    publish(
      ports.identity() !== token.identity
        ? "conflict"
        : success
          ? "restored"
          : "restore-error"
    )
  }
  return {
    save,
    undo,
    getStatus: () => status,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
