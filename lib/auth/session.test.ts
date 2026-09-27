import { describe, expect, it } from "vitest"
import {
  classifySessionResponse,
  forgetRememberedUser,
  nextAuthSnapshot,
  readRememberedUser,
  rememberUser,
  shouldWipeAuthedData,
  type AuthSnapshot,
} from "./session"
import type { StoragePort } from "@/lib/store/persistence"

const USER = { id: "user-a", email: "a@example.com" }

const LOADING: AuthSnapshot = { status: "loading", user: null, endedBy: null }
const AUTHED: AuthSnapshot = { status: "authed", user: USER, endedBy: null }
const ANON: AuthSnapshot = { status: "anon", user: null, endedBy: null }

function memoryStorage(): StoragePort {
  const map = new Map<string, string>()
  return {
    read: (key) => map.get(key) ?? null,
    write: (key, value) => {
      map.set(key, value)
      return true
    },
    remove: (key) => {
      map.delete(key)
    },
    keys: () => Array.from(map.keys()),
  }
}

describe("classifySessionResponse", () => {
  const ok = { ok: true, status: 200 }

  it("treats a verified user as authed", () => {
    expect(classifySessionResponse(ok, { user: USER })).toEqual({
      kind: "authed",
      user: USER,
    })
  })

  it("treats an OK empty session as a confirmed sign-out", () => {
    expect(classifySessionResponse(ok, null).kind).toBe("signed-out")
    expect(classifySessionResponse(ok, { user: null }).kind).toBe("signed-out")
  })

  it("treats 401 and 403 as a confirmed sign-out", () => {
    expect(classifySessionResponse({ ok: false, status: 401 }, null).kind).toBe(
      "signed-out"
    )
    expect(classifySessionResponse({ ok: false, status: 403 }, null).kind).toBe(
      "signed-out"
    )
  })

  it("never reads a failed request, 5xx, 429 or unparseable body as signed out", () => {
    expect(classifySessionResponse(null, undefined).kind).toBe("unverified")
    for (const status of [429, 500, 502, 503, 504]) {
      expect(classifySessionResponse({ ok: false, status }, null).kind).toBe(
        "unverified"
      )
    }
    expect(classifySessionResponse(ok, undefined).kind).toBe("unverified")
    expect(classifySessionResponse(ok, { user: { id: "" } }).kind).toBe(
      "unverified"
    )
  })
})

describe("nextAuthSnapshot", () => {
  it("keeps a signed-in user signed in when the check is unverified", () => {
    expect(nextAuthSnapshot(AUTHED, { kind: "unverified" }, null)).toBe(AUTHED)
  })

  it("opens the last verified account on an offline cold start", () => {
    expect(nextAuthSnapshot(LOADING, { kind: "unverified" }, USER)).toEqual({
      status: "authed",
      user: USER,
      endedBy: null,
    })
  })

  it("falls back to guest on an offline cold start with no remembered account", () => {
    expect(nextAuthSnapshot(LOADING, { kind: "unverified" }, null)).toEqual(
      ANON
    )
  })

  it("marks a server-confirmed loss of an active session as session-lost", () => {
    expect(nextAuthSnapshot(AUTHED, { kind: "signed-out" }, USER)).toEqual({
      status: "anon",
      user: null,
      endedBy: "session-lost",
    })
  })

  it("keeps an explicit sign-out reason across later checks", () => {
    const signedOut: AuthSnapshot = { ...ANON, endedBy: "sign-out" }
    expect(nextAuthSnapshot(signedOut, { kind: "signed-out" }, null)).toBe(
      signedOut
    )
    expect(nextAuthSnapshot(signedOut, { kind: "unverified" }, null)).toBe(
      signedOut
    )
  })

  it("does not invent a session end on a cold start without a session", () => {
    expect(nextAuthSnapshot(LOADING, { kind: "signed-out" }, null)).toEqual(
      ANON
    )
  })
})

describe("shouldWipeAuthedData", () => {
  it("wipes account data only after an explicit sign-out", () => {
    expect(shouldWipeAuthedData("sign-out")).toBe(true)
    expect(shouldWipeAuthedData("session-lost")).toBe(false)
    expect(shouldWipeAuthedData(null)).toBe(false)
  })
})

describe("remembered user", () => {
  it("round-trips id and email only", () => {
    const storage = memoryStorage()
    rememberUser(storage, { ...USER, name: "Private Name" })
    expect(readRememberedUser(storage)).toEqual(USER)
    forgetRememberedUser(storage)
    expect(readRememberedUser(storage)).toBeNull()
  })

  it("ignores corrupt or foreign values", () => {
    const storage = memoryStorage()
    storage.write("anchor:last-session-user", "{not json")
    expect(readRememberedUser(storage)).toBeNull()
    storage.write("anchor:last-session-user", JSON.stringify({ id: "" }))
    expect(readRememberedUser(storage)).toBeNull()
  })
})
