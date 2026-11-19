import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Pins the browser-side seam to the self-hosted Anchor backend:
 * - backend URL normalization and the "configured vs local-only" gate;
 * - apiFetch's web branch (same-origin relative path, cookies, JSON accept);
 * - apiFetch's native branch (absolute URL, bearer token, no credentials);
 * - the native session token cache and its no-op behaviour on web.
 *
 * The module captures `isNativePlatform` and `backendUrl` at import time, so
 * every scenario re-imports it with fresh mocks via `loadClient`.
 */

const preferencesCalls = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}))

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}))

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: preferencesCalls.get,
    set: preferencesCalls.set,
    remove: preferencesCalls.remove,
  },
}))

const ENV_KEY = "NEXT_PUBLIC_BACKEND_URL"

type Client = typeof import("./client")

async function loadClient(options: {
  native: boolean
  backendUrl?: string
}): Promise<Client> {
  vi.resetModules()
  const { Capacitor: freshCapacitor } = await import("@capacitor/core")
  vi.mocked(freshCapacitor.isNativePlatform).mockReturnValue(options.native)
  // client.ts gates native mode on `typeof window !== "undefined"`, so the
  // native scenarios need a window to exist in the node test environment.
  if (options.native) vi.stubGlobal("window", {})
  if (options.backendUrl === undefined) {
    delete process.env[ENV_KEY]
  } else {
    process.env[ENV_KEY] = options.backendUrl
  }
  return import("./client")
}

function nativeToken(value: string | null) {
  preferencesCalls.get.mockResolvedValue({ value })
}

beforeEach(() => {
  preferencesCalls.get.mockReset().mockResolvedValue({ value: null })
  preferencesCalls.set.mockReset().mockResolvedValue(undefined)
  preferencesCalls.remove.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  delete process.env[ENV_KEY]
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe("backendUrl", () => {
  it("strips trailing slashes from the configured URL", async () => {
    const client = await loadClient({
      native: false,
      backendUrl: "https://anchor.example.com///",
    })
    expect(client.backendUrl).toBe("https://anchor.example.com")
  })

  it("trims whitespace around the configured URL", async () => {
    const client = await loadClient({
      native: false,
      backendUrl: "  https://anchor.example.com  ",
    })
    expect(client.backendUrl).toBe("https://anchor.example.com")
  })

  it("is empty when the env var is unset or whitespace-only", async () => {
    const unset = await loadClient({ native: false })
    expect(unset.backendUrl).toBe("")

    const blank = await loadClient({ native: false, backendUrl: "   " })
    expect(blank.backendUrl).toBe("")
  })

  it("reports configured only when a real URL is present", async () => {
    const unset = await loadClient({ native: false })
    expect(unset.isBackendConfigured).toBe(false)

    const blank = await loadClient({ native: false, backendUrl: "   " })
    expect(blank.isBackendConfigured).toBe(false)

    const set = await loadClient({
      native: false,
      backendUrl: "https://anchor.example.com",
    })
    expect(set.isBackendConfigured).toBe(true)
  })
})

describe("apiFetch on web", () => {
  it("uses the same-origin relative path with cookies and JSON accept", async () => {
    const client = await loadClient({
      native: false,
      backendUrl: "https://anchor.example.com",
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"))
    vi.stubGlobal("fetch", fetchMock)

    await client.apiFetch("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.c", password: "pw" }),
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/auth/sign-in/email")
    expect(init.credentials).toBe("include")
    const headers = new Headers(init.headers)
    expect(headers.get("Accept")).toBe("application/json")
    expect(headers.get("Authorization")).toBeNull()
  })

  it("keeps an explicit Accept header instead of forcing JSON", async () => {
    const client = await loadClient({ native: false })
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"))
    vi.stubGlobal("fetch", fetchMock)

    await client.apiFetch("/api/whatever", {
      headers: { Accept: "text/plain" },
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new Headers(init.headers).get("Accept")).toBe("text/plain")
  })
})

describe("apiFetch on native", () => {
  it("prefixes the configured backend URL and sends the stored bearer token", async () => {
    const client = await loadClient({
      native: true,
      backendUrl: "https://anchor.example.com",
    })
    nativeToken("tok-123")
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"))
    vi.stubGlobal("fetch", fetchMock)

    await client.apiFetch("/api/auth/sign-in/email", { method: "POST" })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://anchor.example.com/api/auth/sign-in/email")
    expect(init.credentials).toBe("omit")
    const headers = new Headers(init.headers)
    expect(headers.get("Authorization")).toBe("Bearer tok-123")
  })

  it("falls back to the bare path when no backend URL is configured", async () => {
    const client = await loadClient({ native: true })
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"))
    vi.stubGlobal("fetch", fetchMock)

    await client.apiFetch("/api/ping")

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/ping")
  })

  it("omits the Authorization header when no token is stored", async () => {
    const client = await loadClient({
      native: true,
      backendUrl: "https://anchor.example.com",
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"))
    vi.stubGlobal("fetch", fetchMock)

    await client.apiFetch("/api/ping")

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new Headers(init.headers).get("Authorization")).toBeNull()
    expect(init.credentials).toBe("omit")
  })

  it("does not force JSON accept on native", async () => {
    const client = await loadClient({
      native: true,
      backendUrl: "https://anchor.example.com",
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"))
    vi.stubGlobal("fetch", fetchMock)

    await client.apiFetch("/api/ping")

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new Headers(init.headers).get("Accept")).toBeNull()
  })
})

describe("native session token", () => {
  it("returns null on web regardless of storage contents", async () => {
    const client = await loadClient({ native: false })
    await expect(client.getSessionToken()).resolves.toBeNull()
    expect(preferencesCalls.get).not.toHaveBeenCalled()
  })

  it("returns the stored token on native and caches the first read", async () => {
    const client = await loadClient({ native: true })
    nativeToken("tok-abc")

    await expect(client.getSessionToken()).resolves.toBe("tok-abc")
    await expect(client.getSessionToken()).resolves.toBe("tok-abc")
    expect(preferencesCalls.get).toHaveBeenCalledTimes(1)
  })

  it("stores a new token under the session key", async () => {
    const client = await loadClient({ native: true })
    await client.setSessionToken("tok-new")

    expect(preferencesCalls.set).toHaveBeenCalledWith({
      key: "anchor_session_token",
      value: "tok-new",
    })
    expect(preferencesCalls.remove).not.toHaveBeenCalled()
  })

  it("removes the key when cleared", async () => {
    const client = await loadClient({ native: true })
    await client.setSessionToken(null)

    expect(preferencesCalls.remove).toHaveBeenCalledWith({
      key: "anchor_session_token",
    })
    expect(preferencesCalls.set).not.toHaveBeenCalled()
  })

  it("clearing the token is a no-op on web", async () => {
    const client = await loadClient({ native: false })
    await client.setSessionToken("ignored")

    expect(preferencesCalls.set).not.toHaveBeenCalled()
    expect(preferencesCalls.remove).not.toHaveBeenCalled()
  })

  it("survives a storage read failure by treating the token as absent", async () => {
    const client = await loadClient({ native: true })
    preferencesCalls.get.mockRejectedValue(new Error("storage unavailable"))

    await expect(client.getSessionToken()).resolves.toBeNull()
  })
})
