import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { appendCheckInMock, listCheckInsMock, captureImmediateMock } =
  vi.hoisted(() => ({
    appendCheckInMock: vi.fn(),
    listCheckInsMock: vi.fn(),
    captureImmediateMock: vi.fn(),
  }))

vi.mock("@/lib/anchor-checkin/storage", () => ({
  appendCheckIn: appendCheckInMock,
  listCheckIns: listCheckInsMock,
}))

vi.mock("@/lib/analytics/server", () => ({
  getPostHogServerClient: () => ({ captureImmediate: captureImmediateMock }),
  postHogRequestContext: (_request: unknown, distinctId: string) => ({
    distinctId,
    sessionId: "sess-1",
  }),
}))

import { GET, POST } from "@/app/api/anchor-checkins/route.server"

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/anchor-checkins", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  appendCheckInMock.mockReset().mockResolvedValue(undefined)
  listCheckInsMock.mockReset().mockResolvedValue([])
  captureImmediateMock.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("GET /api/anchor-checkins", () => {
  it("returns records and a digest without a backend (local fallback)", async () => {
    vi.stubEnv("BACKEND_URL", "")
    delete process.env.NEXT_PUBLIC_BACKEND_URL

    const response = await GET(
      new Request("http://localhost/api/anchor-checkins")
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.records).toEqual([])
    expect(payload).toHaveProperty("digest")
    expect(listCheckInsMock).toHaveBeenCalledWith(undefined)
  })

  it("scopes the storage read to the authenticated user", async () => {
    vi.stubEnv("BACKEND_URL", "https://api.example.com")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ user: { id: "user-42" } }))
    )

    const response = await GET(
      new Request("http://localhost/api/anchor-checkins", {
        headers: { cookie: "session=abc" },
      })
    )

    expect(response.status).toBe(200)
    expect(listCheckInsMock).toHaveBeenCalledWith({
      dir: "data/anchor-checkins/user-42",
    })
  })

  it("rejects an unauthenticated request when a backend is configured", async () => {
    vi.stubEnv("BACKEND_URL", "https://api.example.com")

    const response = await GET(
      new Request("http://localhost/api/anchor-checkins")
    )

    expect(response.status).toBe(401)
    expect(listCheckInsMock).not.toHaveBeenCalled()
  })
})

describe("POST /api/anchor-checkins", () => {
  it("requires a non-empty transcript", async () => {
    for (const body of [{}, { transcript: "   " }, { transcript: 42 }]) {
      const response = await POST(postRequest(body))
      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe("transcript is required")
    }
    expect(appendCheckInMock).not.toHaveBeenCalled()
  })

  it("returns 401 when no credentials are sent and a backend is configured", async () => {
    vi.stubEnv("BACKEND_URL", "https://api.example.com")

    const response = await POST(postRequest({ transcript: "утренний чек-ин" }))

    expect(response.status).toBe(401)
    expect(appendCheckInMock).not.toHaveBeenCalled()
  })

  it("returns 502 when the backend session check fails", async () => {
    vi.stubEnv("BACKEND_URL", "https://api.example.com")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")))

    const response = await POST(
      postRequest({ transcript: "утренний чек-ин" }, { cookie: "session=abc" })
    )

    expect(response.status).toBe(502)
    expect((await response.json()).error).toBe("Auth check failed")
  })

  it("returns 401 when the backend session has no usable user id", async () => {
    vi.stubEnv("BACKEND_URL", "https://api.example.com")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ user: { id: "" } }))
    )

    const response = await POST(
      postRequest({ transcript: "утренний чек-ин" }, { cookie: "session=abc" })
    )

    expect(response.status).toBe(401)
    expect(appendCheckInMock).not.toHaveBeenCalled()
  })

  it("persists the check-in and answers with reflection, digest, and analytics", async () => {
    vi.stubEnv("BACKEND_URL", "https://api.example.com")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ user: { id: "user-42" } }))
    )
    listCheckInsMock.mockResolvedValue([])

    const response = await POST(
      postRequest(
        {
          transcript: "  закрыл контракт-тесты, осталось ревью  ",
          kind: "morning",
        },
        { cookie: "session=abc" }
      )
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.checkIn.kind).toBe("morning")
    expect(payload.checkIn.raw.transcript).toBe(
      "закрыл контракт-тесты, осталось ревью"
    )
    expect(payload.reflection).toBeTruthy()
    expect(payload).toHaveProperty("digest")

    expect(appendCheckInMock).toHaveBeenCalledTimes(1)
    expect(appendCheckInMock.mock.calls[0]![0].id).toBe(payload.checkIn.id)

    expect(captureImmediateMock).toHaveBeenCalledTimes(1)
    const capture = captureImmediateMock.mock.calls[0]![0]
    expect(capture.event).toBe("voice_check_in_completed")
    expect(capture.distinctId).toBe("user-42")
    expect(capture.properties.authenticated).toBe(true)
    expect(capture.properties.kind).toBe("morning")
    expect(capture.properties.$session_id).toBe("sess-1")
  })

  it("buckets the transcript length for analytics", async () => {
    const bucketFor = (transcript: string) => {
      captureImmediateMock.mockClear()
      return POST(postRequest({ transcript }, { cookie: "session=abc" })).then(
        () =>
          captureImmediateMock.mock.calls[0]![0].properties
            .transcript_length_bucket
      )
    }

    await expect(bucketFor("коротко")).resolves.toBe("short")
    await expect(bucketFor("а".repeat(150))).resolves.toBe("medium")
    await expect(bucketFor("б".repeat(600))).resolves.toBe("long")
  })

  it("falls back to anonymous analytics when no backend session exists", async () => {
    vi.stubEnv("BACKEND_URL", "")
    delete process.env.NEXT_PUBLIC_BACKEND_URL

    const response = await POST(
      postRequest({ transcript: "спонтанный чек-ин" })
    )

    expect(response.status).toBe(200)
    expect(listCheckInsMock).toHaveBeenCalledWith(undefined)
    expect(appendCheckInMock).toHaveBeenCalledTimes(1)
    const capture = captureImmediateMock.mock.calls[0]![0]
    expect(capture.distinctId).toBe("anonymous-server-check-in")
    expect(capture.properties.authenticated).toBe(false)
  })
})
