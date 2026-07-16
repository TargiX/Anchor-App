import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"
import { createCloudInboundSync, mergeCloudState } from "./cloud"
import { INITIAL_STATE, type AppState } from "./state"

function createRealtimeClient() {
  let postgresChangesCallback: (() => void) | undefined
  let statusCallback: ((status: string) => void) | undefined
  const channel = {
    on: vi.fn(
      (
        _type: string,
        _filter: object,
        callback: () => void
      ) => {
        postgresChangesCallback = callback
        return channel
      }
    ),
    subscribe: vi.fn((callback: (status: string) => void) => {
      statusCallback = callback
      return channel
    }),
  }
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn().mockResolvedValue("ok"),
  }

  return {
    client: client as unknown as SupabaseClient,
    channel,
    emitChange: () => postgresChangesCallback?.(),
    emitStatus: (status: string) => statusCallback?.(status),
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
})

describe("cloud inbound sync", () => {
  it("registers the user-filtered channel, reconciles on subscribe, and disposes it", async () => {
    const realtime = createRealtimeClient()
    const loadState = vi.fn().mockResolvedValue(INITIAL_STATE)
    const onError = vi.fn()
    const inbound = createCloudInboundSync({
      client: realtime.client,
      userId: "user-a",
      initialBaselineState: INITIAL_STATE,
      getLocalState: () => INITIAL_STATE,
      replaceLocalState: vi.fn(),
      isActive: () => true,
      loadState,
      onError,
    })

    inbound.start()

    expect(realtime.client.channel).toHaveBeenCalledWith(
      "anchor-user-state:user-a"
    )
    expect(realtime.channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "anchor_user_states",
        filter: "user_id=eq.user-a",
      },
      expect.any(Function)
    )

    realtime.emitStatus("SUBSCRIBED")
    await vi.waitFor(() => expect(loadState).toHaveBeenCalledTimes(1))

    realtime.emitStatus("CLOSED")
    realtime.emitStatus("SUBSCRIBED")
    await vi.waitFor(() => expect(loadState).toHaveBeenCalledTimes(2))

    realtime.emitStatus("CHANNEL_ERROR")
    realtime.emitStatus("TIMED_OUT")
    expect(onError).toHaveBeenCalledTimes(2)

    inbound.dispose()
    expect(realtime.client.removeChannel).toHaveBeenCalledWith(realtime.channel)
  })

  it("replaces an unchanged same-date local entry with the newer remote value", async () => {
    const realtime = createRealtimeClient()
    let resolveLoad!: (state: AppState) => void
    const loadPromise = new Promise<AppState>((resolve) => {
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
      client: realtime.client,
      userId: "user-a",
      initialBaselineState: baseline,
      getLocalState: () => local,
      replaceLocalState,
      isActive: () => true,
      loadState: vi.fn().mockReturnValue(loadPromise),
      onStateApplied,
    })
    inbound.start()

    realtime.emitChange()
    local = structuredClone(baseline)
    resolveLoad(remote)
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
    const realtime = createRealtimeClient()
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
    const selfEcho: AppState = {
      ...offlineLocal,
      entries: {
        ...olderRemote.entries,
        ...offlineLocal.entries,
      },
      notificationEvening: "21:30",
    }
    const newerRemote: AppState = {
      ...selfEcho,
      entries: {
        ...selfEcho.entries,
        "2026-07-16": { date: "2026-07-16", journal: "newer remote edit" },
      },
    }
    let local = structuredClone(offlineLocal)
    const replaceLocalState = vi.fn((state: AppState) => {
      local = state
    })
    const onRecoverySaveNeeded = vi.fn()
    const loadState = vi
      .fn()
      .mockResolvedValueOnce(olderRemote)
      .mockResolvedValueOnce(selfEcho)
      .mockResolvedValueOnce(newerRemote)
    const inbound = createCloudInboundSync({
      client: realtime.client,
      userId: "user-a",
      initialBaselineState: null,
      getLocalState: () => local,
      replaceLocalState,
      isActive: () => true,
      loadState,
      onRecoverySaveNeeded,
    })

    await inbound.refresh()
    expect(local).toEqual(selfEcho)
    expect(local.entries["2026-07-16"]?.journal).toBe("pending offline edit")
    expect(local.entries["2026-07-15"]?.journal).toBe("remote-only entry")
    expect(local.habits).toEqual([pendingHabit])
    expect(local.notificationMorning).toBe("06:30")
    expect(local.notificationEvening).toBe("21:30")
    expect(onRecoverySaveNeeded).toHaveBeenCalledOnce()
    expect(onRecoverySaveNeeded).toHaveBeenCalledWith(selfEcho)

    // A successful save can echo the merged local state without rerendering.
    // Observing it still advances the confirmed baseline.
    await inbound.refresh()
    expect(replaceLocalState).toHaveBeenCalledTimes(1)
    expect(onRecoverySaveNeeded).toHaveBeenCalledOnce()

    await inbound.refresh()
    expect(replaceLocalState).toHaveBeenCalledTimes(2)
    expect(onRecoverySaveNeeded).toHaveBeenCalledOnce()
    expect(local).toEqual(newerRemote)
    expect(local.entries["2026-07-16"]?.journal).toBe("newer remote edit")
  })

  it("hands protected local work off when an unknown baseline recovers to an empty row", async () => {
    const realtime = createRealtimeClient()
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
    const loadState = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(local)
    const inbound = createCloudInboundSync({
      client: realtime.client,
      userId: "user-a",
      initialBaselineState: null,
      getLocalState: () => local,
      replaceLocalState,
      isActive: () => true,
      loadState,
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
    const realtime = createRealtimeClient()
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
    const inbound = createCloudInboundSync({
      client: realtime.client,
      userId: "user-a",
      initialBaselineState: baseline,
      getLocalState: () => local,
      replaceLocalState,
      isActive: () => true,
      loadState: vi.fn().mockResolvedValue(remote),
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
    const realtime = createRealtimeClient()
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
    const inbound = createCloudInboundSync({
      client: realtime.client,
      userId: "user-a",
      initialBaselineState: baseline,
      getLocalState: () => local,
      replaceLocalState,
      isActive: () => true,
      loadState: vi
        .fn()
        .mockResolvedValueOnce(echoed)
        .mockResolvedValueOnce(nextRemote),
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
    const realtime = createRealtimeClient()
    let active = true
    let resolveLoad!: (state: AppState) => void
    const loadPromise = new Promise<AppState>((resolve) => {
      resolveLoad = resolve
    })
    const replaceLocalState = vi.fn()
    const loadState = vi.fn().mockReturnValue(loadPromise)
    const inbound = createCloudInboundSync({
      client: realtime.client,
      userId: "user-a",
      initialBaselineState: INITIAL_STATE,
      getLocalState: () => INITIAL_STATE,
      replaceLocalState,
      isActive: () => active,
      loadState,
    })
    inbound.start()

    realtime.emitChange()
    await vi.waitFor(() => expect(loadState).toHaveBeenCalledTimes(1))
    active = false
    resolveLoad({ ...INITIAL_STATE, notificationMorning: "07:00" })
    await Promise.resolve()
    await Promise.resolve()
    expect(replaceLocalState).not.toHaveBeenCalled()

    active = true
    inbound.dispose()
    realtime.emitChange()
    await Promise.resolve()
    expect(loadState).toHaveBeenCalledTimes(1)
  })
})
