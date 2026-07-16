import { describe, expect, it, vi } from "vitest"
import {
  createCloudSaveCoordinator,
  createCloudSyncStatusController,
} from "./sync-status"

function deferred() {
  let resolve!: () => void
  let reject!: () => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe("cloud sync lifecycle", () => {
  it("moves through initial sync, saving, saved, and error states", () => {
    const status = createCloudSyncStatusController()
    const session = status.begin("user-a")

    expect(status.getSnapshot()).toEqual({
      phase: "initial-sync",
      userId: "user-a",
    })

    status.update(session, "saving")
    expect(status.getSnapshot().phase).toBe("saving")
    status.update(session, "saved")
    expect(status.getSnapshot().phase).toBe("saved")
    status.update(session, "error")
    expect(status.getSnapshot().phase).toBe("error")

    status.end(session)
    expect(status.getSnapshot()).toEqual({ phase: "inactive", userId: null })
  })

  it("ignores stale completions after the authenticated user changes", () => {
    const status = createCloudSyncStatusController()
    const oldSession = status.begin("user-a")
    const currentSession = status.begin("user-b")

    expect(status.update(oldSession, "saved")).toBe(false)
    expect(status.getSnapshot()).toEqual({
      phase: "initial-sync",
      userId: "user-b",
    })

    expect(status.update(currentSession, "saved")).toBe(true)
    expect(status.getSnapshot()).toEqual({
      phase: "saved",
      userId: "user-b",
    })
  })
})

describe("cloud save coordinator", () => {
  it("rebases a delayed pending save without creating an extra write", async () => {
    const status = createCloudSyncStatusController()
    const session = status.begin("user-a")
    const save = vi.fn<(state: string) => Promise<void>>().mockResolvedValue()
    const coordinator = createCloudSaveCoordinator({ session, status, save })

    coordinator.schedule("stale local state")
    expect(coordinator.rebasePending("local plus remote state")).toBe(true)
    await coordinator.flush()

    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith("local plus remote state")
  })

  it("writes a rebased state immediately after an in-flight stale save", async () => {
    const status = createCloudSyncStatusController()
    const session = status.begin("user-a")
    const staleSave = deferred()
    const rebasedSave = deferred()
    const save = vi
      .fn<(state: string) => Promise<void>>()
      .mockReturnValueOnce(staleSave.promise)
      .mockReturnValueOnce(rebasedSave.promise)
    const coordinator = createCloudSaveCoordinator({ session, status, save })

    coordinator.schedule("stale local state")
    const flushing = coordinator.flush()
    expect(coordinator.rebasePending("local plus remote state")).toBe(true)
    expect(save).toHaveBeenCalledTimes(1)

    staleSave.resolve()
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    expect(save).toHaveBeenNthCalledWith(2, "local plus remote state")

    rebasedSave.resolve()
    await flushing
    expect(status.getSnapshot().phase).toBe("saved")
  })

  it("does not create or report outbound work when rebasing while idle", async () => {
    const status = createCloudSyncStatusController()
    const session = status.begin("user-a")
    status.update(session, "saved")
    const save = vi.fn<(state: string) => Promise<void>>().mockResolvedValue()
    const coordinator = createCloudSaveCoordinator({ session, status, save })

    expect(coordinator.rebasePending("inbound-only state")).toBe(false)
    await coordinator.flush()

    expect(save).not.toHaveBeenCalled()
    expect(status.getSnapshot().phase).toBe("saved")
  })

  it("rejects rebases for stale or disposed coordinators", () => {
    const status = createCloudSyncStatusController()
    const staleSession = status.begin("user-a")
    const staleCoordinator = createCloudSaveCoordinator({
      session: staleSession,
      status,
      save: vi.fn(),
    })
    staleCoordinator.schedule("user-a state")
    status.begin("user-b")

    expect(staleCoordinator.rebasePending("wrong account state")).toBe(false)

    const currentSession = status.begin("user-c")
    const disposedCoordinator = createCloudSaveCoordinator({
      session: currentSession,
      status,
      save: vi.fn(),
    })
    disposedCoordinator.schedule("user-c state")
    disposedCoordinator.dispose()

    expect(disposedCoordinator.rebasePending("disposed state")).toBe(false)
  })

  it("serializes writes and saves the latest edit before reporting saved", async () => {
    const status = createCloudSyncStatusController()
    const session = status.begin("user-a")
    const first = deferred()
    const second = deferred()
    const save = vi
      .fn<(state: string) => Promise<void>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const coordinator = createCloudSaveCoordinator({ session, status, save })

    coordinator.schedule("first")
    const flushing = coordinator.flush()
    coordinator.schedule("latest")
    await coordinator.flush()

    expect(save).toHaveBeenCalledTimes(1)
    expect(status.getSnapshot().phase).toBe("saving")

    first.resolve()
    await Promise.resolve()
    expect(save).toHaveBeenNthCalledWith(2, "latest")
    expect(status.getSnapshot().phase).toBe("saving")

    second.resolve()
    await flushing
    expect(status.getSnapshot().phase).toBe("saved")
  })

  it("allows the next state change to retry after a failed save", async () => {
    const status = createCloudSyncStatusController()
    const session = status.begin("user-a")
    const save = vi
      .fn<(state: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce()
    const coordinator = createCloudSaveCoordinator({ session, status, save })

    coordinator.schedule("failed state")
    await coordinator.flush()
    expect(status.getSnapshot().phase).toBe("error")

    coordinator.schedule("next local state")
    expect(status.getSnapshot().phase).toBe("saving")
    await coordinator.flush()

    expect(save).toHaveBeenNthCalledWith(2, "next local state")
    expect(status.getSnapshot().phase).toBe("saved")
  })

  it("does not publish a stale save completion after an account switch", async () => {
    const status = createCloudSyncStatusController()
    const oldSession = status.begin("user-a")
    const pending = deferred()
    const coordinator = createCloudSaveCoordinator({
      session: oldSession,
      status,
      save: () => pending.promise,
    })

    coordinator.schedule("user-a state")
    const flushing = coordinator.flush()
    status.begin("user-b")
    pending.resolve()
    await flushing

    expect(status.getSnapshot()).toEqual({
      phase: "initial-sync",
      userId: "user-b",
    })
  })
})
