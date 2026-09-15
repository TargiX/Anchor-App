import { expect, it, vi } from "vitest"
import { createDeletionOperation } from "./journal-deletion"
import type { DeletedNote } from "./journal-editing"

const token: DeletedNote = {
  target: { day: "2026-09-16" },
  original: "Keep me",
  identity: "guest",
  index: -1,
}
function fixture() {
  const ports = {
    flush: vi.fn(async () => true),
    retry: vi.fn(async () => true),
    undo: vi.fn(() => true),
    identity: vi.fn(() => "guest"),
  }
  return { ports, operation: createDeletionOperation(token, ports) }
}
it("does not report deletion until the asynchronous write is acknowledged", async () => {
  const { ports, operation } = fixture()
  let finish!: (result: boolean) => void
  ports.flush.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const result = operation.save()
  expect(operation.getStatus()).toBe("saving")
  await operation.save(true)
  expect(ports.retry).not.toHaveBeenCalled()
  finish(true)
  await result
  expect(operation.getStatus()).toBe("deleted")
})
it.each([false, "throw"])(
  "retains failed deletion and performs a fresh write on retry: %s",
  async (failure) => {
    const { ports, operation } = fixture()
    if (failure === "throw")
      ports.flush.mockRejectedValueOnce(new Error("disk"))
    else ports.flush.mockResolvedValueOnce(false)
    await operation.save()
    expect(operation.getStatus()).toBe("error")
    await operation.save(true)
    expect(ports.retry).toHaveBeenCalledTimes(1)
    expect(operation.getStatus()).toBe("deleted")
  }
)
it("can undo a failed deletion, and retries a failed rollback without applying it twice", async () => {
  const { ports, operation } = fixture()
  ports.flush.mockResolvedValue(false)
  await operation.save()
  await operation.undo()
  expect(operation.getStatus()).toBe("restore-error")
  await operation.undo()
  expect(ports.undo).toHaveBeenCalledTimes(1)
  expect(ports.retry).toHaveBeenCalledTimes(1)
  expect(operation.getStatus()).toBe("restored")
})
it("rejects retries after an account change", async () => {
  const { ports, operation } = fixture()
  ports.flush.mockResolvedValue(false)
  await operation.save()
  ports.identity.mockReturnValue("another account")
  await operation.save(true)
  await operation.undo()
  expect(operation.getStatus()).toBe("conflict")
  expect(ports.retry).not.toHaveBeenCalled()
  expect(ports.undo).not.toHaveBeenCalled()
})
it("does not announce success for the previous account after a delayed save", async () => {
  const { ports, operation } = fixture()
  let finish!: (result: boolean) => void
  ports.flush.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const result = operation.save()
  ports.identity.mockReturnValue("another account")
  finish(true)
  await result
  expect(operation.getStatus()).toBe("conflict")
})

it("retries the actual native snapshot after a disk failure, then durably undoes it", async () => {
  vi.resetModules()
  const { createNativeStorage } = await import("./native-storage")
  const store = await import("./store")
  const { deleteJournalText, undoJournalDeletion } =
    await import("./journal-editing")
  const { INITIAL_STATE, ANON_STORAGE_KEY, STATE_VERSION } =
    await import("./state")
  const day = "2026-09-16"
  let archive = JSON.stringify({
    [ANON_STORAGE_KEY]: JSON.stringify({
      version: STATE_VERSION,
      data: {
        ...INITIAL_STATE,
        entries: { [day]: { date: day, journal: "Keep me" } },
      },
    }),
  })
  const disk = {
    load: async () => ({ value: archive }),
    save: vi.fn(async ({ value }: { value: string }) => {
      archive = value
    }),
  }
  const native = await createNativeStorage(
    disk,
    { keys: () => [], read: () => null, write: () => false, remove: () => {} },
    vi.fn()
  )
  store.installDeviceStorage(native.storage, native.flush, native.retry)
  store.setStorageScope("anon")
  store.hydrateFromStorage()
  disk.save.mockRejectedValueOnce(new Error("disk full"))
  const deleted = deleteJournalText({ day }, { note: "Keep me", nextStep: "" })!
  const operation = createDeletionOperation(deleted, {
    flush: store.flushDeviceStorage,
    retry: store.retryDeviceStorage,
    undo: undoJournalDeletion,
    identity: store.getStorageIdentity,
  })
  const savedDay = () =>
    JSON.parse(JSON.parse(archive)[ANON_STORAGE_KEY]).data.entries[day]
  await operation.save()
  expect(operation.getStatus()).toBe("error")
  expect(savedDay().journal).toBe("Keep me")
  await operation.save(true)
  expect(operation.getStatus()).toBe("deleted")
  expect(savedDay().journal).toBeUndefined()
  await operation.undo()
  expect(operation.getStatus()).toBe("restored")
  expect(savedDay().journal).toBe("Keep me")
})
