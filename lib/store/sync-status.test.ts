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
