import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createCloudInboundSync,
  mergeCloudState,
  type CloudStateSnapshot,
  type CloudTransport,
} from "./cloud"
import { INITIAL_STATE, type AppState } from "./state"

function createFakeTransport() {
  const load = vi.fn<() => Promise<CloudStateSnapshot>>()
  const save = vi.fn()
  const version = vi.fn<() => Promise<string | null>>()
  const transport: CloudTransport & {
    load: typeof load
    save: typeof save
    version: typeof version
  } = {
    load,
    save,
    version,
    lastVersion: null,
  }
  return {
    transport,
    load,
    version,
    respond(state: AppState | null, updatedAt = "2026-09-20T00:00:00.000Z") {
      return { state, updatedAt }
    },
  }
}

describe("mergeCloudState", () => {
  it("keeps remote entries and lets local entries win for the same date", () => {
    const remote: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-06": { date: "2026-06-06", journal: "remote" },
        "2026-06-07": { date: "2026-06-07", intention: "remote" },
      },
    }
    const local: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-06-07": { date: "2026-06-07", intention: "local" },
      },
    }

    expect(mergeCloudState(local, remote).entries).toEqual({
      "2026-06-06": { date: "2026-06-06", journal: "remote" },
      "2026-06-07": { date: "2026-06-07", intention: "local" },
    })
  })

  it("uses remote settings until local settings are customized", () => {
    const remote: AppState = {
      ...INITIAL_STATE,
      notificationMorning: "07:15",
      notificationEvening: "22:00",
    }
    const local: AppState = INITIAL_STATE

    expect(mergeCloudState(local, remote)).toMatchObject({
      notificationMorning: "07:15",
      notificationEvening: "22:00",
    })
  })

  it("keeps a local weekly direction and inherits a remote one when local has none", () => {
    const direction = {
      text: "Call Ada",
      weekEnd: "2026-09-18",
      sourceDay: "2026-09-18",
      sourceId: "b054f9f9-e276-43fe-9663-d7f0071aa431",
      status: "open" as const,
    }
    expect(
      mergeCloudState(
        { ...INITIAL_STATE, weeklyDirection: direction },
        INITIAL_STATE
      ).weeklyDirection
    ).toEqual(direction)
    expect(
      mergeCloudState(INITIAL_STATE, {
        ...INITIAL_STATE,
        weeklyDirection: direction,
      }).weeklyDirection
    ).toEqual(direction)
  })
})

describe("cloud inbound sync", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("reconciles on start and polls only when the server version differs", async () => {
    const { transport, load, version, respond } = createFakeTransport()
    load.mockResolvedValue(respond(INITIAL_STATE))
    version.mockResolvedValue("v1")
    const onError = vi.fn()
    const inbound = createCloudInboundSync({
      transport,
      initialBaselineState: INITIAL_STATE,
      getLocalState: () => INITIAL_STATE,
      replaceLocalState: vi.fn(),
      isActive: () => true,
      pollIntervalMs: 1_000,
      onError,
    })

    inbound.start()
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1))

    // Poll with a matching version → self-echo, no reload.
    ;(transport as { lastVersion: string | null }).lastVersion = "v1"
    await vi.advanceTimersByTimeAsync(1_000)
    expect(version).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledTimes(1)

    // Poll with a newer server version → remote change, reload.
    version.mockResolvedValue("v2")
    await vi.advanceTimersByTimeAsync(1_000)
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2))

    // Poll failure surfaces through onError without killing the loop.
    version.mockRejectedValueOnce(new Error("offline"))
    await vi.advanceTimersByTimeAsync(1_000)
    expect(onError).toHaveBeenCalledTimes(1)

    inbound.dispose()
    version.mockClear()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(version).not.toHaveBeenCalled()
  })

  it("replaces an unchanged same-date local entry with the newer remote value", async () => {
    const { transport, respond } = createFakeTransport()
    let resolveLoad!: (snapshot: CloudStateSnapshot) => void
    const loadPromise = new Promise<CloudStateSnapshot>((resolve) => {
      resolveLoad = resolve
    })
    const baseline: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-07-16": { date: "2026-07-16", journal: "old" },
        "2026-07-15": { date: "2026-07-15", journal: "remove me" },
      },
    }
    const remote: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-07-16": { date: "2026-07-16", journal: "newer remote" },
      },
    }
    let local: AppState = baseline
    const replaceLocalState = vi.fn()
    const onStateApplied = vi.fn()
    const inbound = createCloudInboundSync({
      transport,
      initialBaselineState: baseline,
      getLocalState: () => local,
      replaceLocalState,
      isActive: () => true,
      onStateApplied,
    })
    transport.load.mockReturnValue(loadPromise)

    const refreshPromise = inbound.refresh()
    local = structuredClone(baseline)
    resolveLoad(respond(remote))
    await refreshPromise
    await vi.waitFor(() => expect(replaceLocalState).toHaveBeenCalledOnce())

    expect(replaceLocalState).toHaveBeenCalledWith(
      {
        ...INITIAL_STATE,
        entries: {
          "2026-07-16": { date: "2026-07-16", journal: "newer remote" },
        },
      },
      { persistCloud: false }
    )
    expect(onStateApplied).toHaveBeenCalledOnce()
    const appliedState = replaceLocalState.mock.calls[0]![0]
    expect(onStateApplied.mock.calls[0]![0]).toBe(appliedState)
  })

  it("hands merged offline and remote work off when an unknown baseline recovers", async () => {
    const { transport, respond } = createFakeTransport()
    const pendingHabit = { id: "write", name: "Write", icon: "pencil" }
    const offlineLocal: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-07-16": { date: "2026-07-16", journal: "pending offline edit" },
      },
      habits: [pendingHabit],
      notificationMorning: "06:30",
    }
    const olderRemote: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-07-15": { date: "2026-07-15", journal: "remote-only entry" },
        "2026-07-16": { date: "2026-07-16", journal: "older cloud value" },
      },
      notificationEvening: "21:30",
    }
    const mergedRecovery: AppState = {
      ...offlineLocal,
      entries: {
        ...olderRemote.entries,
        ...offlineLocal.entries,
      },
      notificationEvening: "21:30",
    }
    const concurrentRemote: AppState = {
      ...olderRemote,
      entries: {
        ...olderRemote.entries,
        "2026-07-15": { date: "2026-07-15", journal: "newer remote-only entry" },
        "2026-07-16": { date: "2026-07-16", journal: "newer remote edit" },
      },
      notificationEvening: "22:00",
    }
    let local = structuredClone(offlineLocal)
    const replaceLocalState = vi.fn((state: AppState) => {
      local = state
    })
    const onRecoverySaveNeeded = vi.fn()
    transport.load
      .mockResolvedValueOnce(respond(olderRemote))
      .mockResolvedValueOnce(respond(concurrentRemote))
    const inbound = createCloudInboundSync({
      transport,
      initialBaselineState: null,
      getLocalState: () => local,
      replaceLocalState,
      isActive: () => true,
      onRecoverySaveNeeded,
    })

    await inbound.refresh()
    expect(local).toEqual(mergedRecovery)
    expect(local.entries["2026-07-16"]?.journal).toBe("pending offline edit")
    expect(local.entries["2026-07-15"]?.journal).toBe("remote-only entry")
    expect(local.habits).toEqual([pendingHabit])
    expect(local.notificationMorning).toBe("06:30")
    expect(local.notificationEvening).toBe("21:30")
    expect(onRecoverySaveNeeded).toHaveBeenCalledOnce()
    expect(onRecoverySaveNeeded).toHaveBeenCalledWith(mergedRecovery)

    // A newer remote row can arrive before the recovery save echoes back. Only
    // the true offline edits stay protected; values inherited from the first
    // observed row must continue following the cloud baseline.
    await inbound.refresh()
    expect(replaceLocalState).toHaveBeenCalledTimes(2)
    expect(onRecoverySaveNeeded).toHaveBeenCalledTimes(2)
    expect(onRecoverySaveNeeded).toHaveBeenLastCalledWith(local)
    expect(local.entries["2026-07-15"]?.journal).toBe("newer remote-only entry")
    expect(local.entries["2026-07-16"]?.journal).toBe("pending offline edit")
    expect(local.habits).toEqual([pendingHabit])
    expect(local.notificationMorning).toBe("06:30")
    expect(local.notificationEvening).toBe("22:00")
  })

  it("hands protected local work off when an unknown baseline recovers to an empty row", async () => {
    const { transport, respond } = createFakeTransport()
    const local: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-07-16": { date: "2026-07-16", journal: "offline edit" },
      },
      notificationMorning: "06:30",
    }
    const replaceLocalState = vi.fn()
    const onStateApplied = vi.fn()
    const onRecoverySaveNeeded = vi.fn()
    transport.load
      .mockResolvedValueOnce(respond(null))
      .mockResolvedValueOnce(respond(local))
    const inbound = createCloudInboundSync({
      transport,
      initialBaselineState: null,
      getLocalState: () => local,
      replaceLocalState,
      isActive: () => true,
      onStateApplied,
      onRecoverySaveNeeded,
    })

    await inbound.refresh()

    expect(replaceLocalState).not.toHaveBeenCalled()
    expect(onStateApplied).not.toHaveBeenCalled()
    expect(onRecoverySaveNeeded).toHaveBeenCalledOnce()
    expect(onRecoverySaveNeeded).toHaveBeenCalledWith(local)

    await inbound.refresh()
    expect(onRecoverySaveNeeded).toHaveBeenCalledOnce()
  })

  it("preserves pending local dates and whole fields that diverged from baseline", async () => {
    const { transport, respond } = createFakeTransport()
    const baseline: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-07-16": { date: "2026-07-16", journal: "old" },
      },
    }
    const pendingHabit = { id: "write", name: "Write", icon: "pencil" }
    const local: AppState = {
      ...baseline,
      entries: {
        "2026-07-16": { date: "2026-07-16", journal: "pending local" },
      },
      habits: [pendingHabit],
      notificationMorning: "06:30",
    }
    const remote: AppState = {
      ...INITIAL_STATE,
      entries: {
        "2026-07-16": { date: "2026-07-16", journal: "remote edit" },
      },
      habits: [{ id: "run", name: "Run", icon: "footprints" }],
      notificationMorning: "07:30",
      notificationEvening: "21:30",
    }
    const replaceLocalState = vi.fn()
    transport.load.mockResolvedValue(respond(remote))
    const inbound = createCloudInboundSync({
      transport,
      initialBaselineState: baseline,
      getLocalState: () => local,
      replaceLocalState,
      isActive: () => true,
    })

    await inbound.refresh()

    expect(replaceLocalState).toHaveBeenCalledWith(
      {
        entries: local.entries,
        habits: [pendingHabit],
        notificationMorning: "06:30",
        notificationEvening: "21:30",
      },
      { persistCloud: false }
    )
  })

  it("advances the baseline for a self echo without rerendering", async () => {
    const { transport, respond } = createFakeTransport()
    const baseline: AppState = {
      ...INITIAL_STATE,
      notificationMorning: "08:00",
    }
    let local: AppState = {
      ...baseline,
      notificationMorning: "07:30",
    }
    const echoed = structuredClone(local)
    const nextRemote: AppState = {
      ...echoed,
      notificationMorning: "07:00",
    }
    const replaceLocalState = vi.fn((state: AppState) => {
      local = state
    })
    const onStateApplied = vi.fn()
    transport.load
      .mockResolvedValueOnce(respond(echoed))
      .mockResolvedValueOnce(respond(nextRemote))
    const inbound = createCloudInboundSync({
      transport,
      initialBaselineState: baseline,
      getLocalState: () => local,
      replaceLocalState,
      isActive: () => true,
      onStateApplied,
    })

    await inbound.refresh()
    expect(replaceLocalState).not.toHaveBeenCalled()
    expect(onStateApplied).not.toHaveBeenCalled()

    await inbound.refresh()
    expect(replaceLocalState).toHaveBeenCalledWith(nextRemote, {
      persistCloud: false,
    })
    expect(onStateApplied).toHaveBeenCalledWith(nextRemote)
  })

  it("does not apply a refetch that becomes stale or start after disposal", async () => {
    const { transport, respond } = createFakeTransport()
    let active = true
    let resolveLoad!: (snapshot: CloudStateSnapshot) => void
    const loadPromise = new Promise<CloudStateSnapshot>((resolve) => {
      resolveLoad = resolve
    })
    const replaceLocalState = vi.fn()
    transport.load.mockReturnValue(loadPromise)
    const inbound = createCloudInboundSync({
      transport,
      initialBaselineState: INITIAL_STATE,
      getLocalState: () => INITIAL_STATE,
      replaceLocalState,
      isActive: () => active,
    })
    inbound.start()

    await vi.waitFor(() => expect(transport.load).toHaveBeenCalledTimes(1))
    active = false
    resolveLoad(
      respond({ ...INITIAL_STATE, notificationMorning: "07:00" })
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(replaceLocalState).not.toHaveBeenCalled()

    active = true
    inbound.dispose()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(transport.load).toHaveBeenCalledTimes(1)
  })
})
