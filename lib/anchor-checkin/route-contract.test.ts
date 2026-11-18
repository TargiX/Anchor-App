import { afterEach, describe, expect, it } from "vitest"
import type { AnchorCheckIn } from "./checkin"
import {
  latestMorningIntention,
  parseKind,
  resolveBackendUrl,
  storageOptionsForUser,
} from "./route-contract"

const ENV_KEYS = ["BACKEND_URL", "NEXT_PUBLIC_BACKEND_URL"] as const

function withEnv(
  values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>,
  run: () => void
) {
  const saved = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]])
  )
  for (const key of ENV_KEYS) {
    if (values[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = values[key]
    }
  }
  try {
    run()
  } finally {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = saved[key]
      }
    }
  }
}

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
})

describe("resolveBackendUrl", () => {
  it("returns undefined when no backend env is set (local-only fallback)", () => {
    withEnv({}, () => {
      expect(resolveBackendUrl()).toBeUndefined()
    })
  })

  it("accepts an https URL and strips trailing slashes", () => {
    withEnv({ BACKEND_URL: "https://api.example.com///" }, () => {
      expect(resolveBackendUrl()).toBe("https://api.example.com")
    })
  })

  it("accepts loopback http for local development", () => {
    withEnv({ BACKEND_URL: "http://localhost:8080/" }, () => {
      expect(resolveBackendUrl()).toBe("http://localhost:8080")
    })
    withEnv({ BACKEND_URL: "http://127.0.0.1" }, () => {
      expect(resolveBackendUrl()).toBe("http://127.0.0.1")
    })
  })

  it("rejects plain http to a non-loopback host so cookies cannot leak", () => {
    withEnv({ BACKEND_URL: "http://api.example.com" }, () => {
      expect(resolveBackendUrl()).toBeUndefined()
    })
  })

  it("rejects a value that is not a URL", () => {
    withEnv({ BACKEND_URL: "not a url" }, () => {
      expect(resolveBackendUrl()).toBeUndefined()
    })
  })

  it("prefers BACKEND_URL over the public env var", () => {
    withEnv(
      {
        BACKEND_URL: "https://internal.example.com",
        NEXT_PUBLIC_BACKEND_URL: "http://insecure.example.com",
      },
      () => {
        expect(resolveBackendUrl()).toBe("https://internal.example.com")
      }
    )
  })
})

describe("storageOptionsForUser", () => {
  it("returns undefined for the anonymous local fallback", () => {
    expect(storageOptionsForUser(null)).toBeUndefined()
  })

  it("scopes the storage dir to the user id", () => {
    expect(storageOptionsForUser("user-42")).toEqual({
      dir: "data/anchor-checkins/user-42",
    })
  })

  it("neutralizes path separators and traversal in the user id", () => {
    expect(storageOptionsForUser("../../etc")).toEqual({
      dir: "data/anchor-checkins/______etc",
    })
    expect(storageOptionsForUser("a/b\\c:d")).toEqual({
      dir: "data/anchor-checkins/a_b_c_d",
    })
  })
})

describe("parseKind", () => {
  it("accepts the three supported kinds", () => {
    expect(parseKind("morning")).toBe("morning")
    expect(parseKind("evening")).toBe("evening")
    expect(parseKind("spontaneous")).toBe("spontaneous")
  })

  it("rejects unknown kinds and non-strings", () => {
    expect(parseKind("weekly")).toBeUndefined()
    expect(parseKind(42)).toBeUndefined()
    expect(parseKind(undefined)).toBeUndefined()
    expect(parseKind(null)).toBeUndefined()
  })
})

function record(partial: {
  kind: AnchorCheckIn["kind"]
  dayKey: string
  intentionMain?: string
  ts: string
}): AnchorCheckIn {
  // latestMorningIntention reads only kind/ts/intention.main, so a partial
  // shape cast through unknown is enough to pin its selection contract.
  return {
    id: `${partial.kind}-${partial.ts}`,
    kind: partial.kind,
    dayKey: partial.dayKey,
    ts: partial.ts,
    intention: { main: partial.intentionMain ?? "", rest: [] },
  } as unknown as AnchorCheckIn
}

describe("latestMorningIntention", () => {
  it("returns null when there are no morning check-ins", () => {
    const records = [
      record({
        kind: "evening",
        dayKey: "2026-11-17",
        ts: "2026-11-17T20:00:00+07:00",
      }),
    ]
    expect(latestMorningIntention(records)).toBeNull()
    expect(latestMorningIntention([])).toBeNull()
  })

  it("returns the newest morning intention", () => {
    const records = [
      record({
        kind: "morning",
        dayKey: "2026-11-16",
        intentionMain: "закрыть ревью",
        ts: "2026-11-16T09:00:00+07:00",
      }),
      record({
        kind: "morning",
        dayKey: "2026-11-17",
        intentionMain: "добить контракт-тесты",
        ts: "2026-11-17T09:00:00+07:00",
      }),
    ]
    expect(latestMorningIntention(records)).toBe("добить контракт-тесты")
  })

  it("skips morning entries without a main intention", () => {
    const records = [
      record({
        kind: "morning",
        dayKey: "2026-11-17",
        intentionMain: "",
        ts: "2026-11-17T09:00:00+07:00",
      }),
      record({
        kind: "morning",
        dayKey: "2026-11-16",
        intentionMain: "держать фокус",
        ts: "2026-11-16T09:00:00+07:00",
      }),
    ]
    expect(latestMorningIntention(records)).toBe("держать фокус")
  })
})
