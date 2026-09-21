"use client"

import { Capacitor } from "@capacitor/core"
import { Preferences } from "@capacitor/preferences"

/**
 * Browser-side seam to the self-hosted Anchor backend.
 *
 * Web traffic is same-origin through Vercel rewrites: callers pass paths
 * like `/api/auth/sign-in/email` and fetch reaches the backend without
 * needing a host prefix. Native builds set `NEXT_PUBLIC_BACKEND_URL` and
 * hit the backend directly with a bearer token.
 */

const SESSION_TOKEN_KEY = "anchor_session_token"

const configuredBackendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ?? ""

export const backendUrl = configuredBackendUrl.replace(/\/+$/, "")

export const isNativePlatform =
  typeof window !== "undefined" && Capacitor.isNativePlatform()

// Configured means "this deployment has a backend": failures are errors, not
// a silent local-only mode. Web reaches it same-origin via rewrites; native
// needs the absolute URL. Unset → local-only mode (dev without a backend).
export const isBackendConfigured = Boolean(backendUrl)

const sessionTokenCache: { value: string | null } = { value: null }
let sessionTokenLoaded = false

async function loadNativeSessionToken(): Promise<string | null> {
  if (sessionTokenLoaded) return sessionTokenCache.value
  sessionTokenLoaded = true
  try {
    const stored = await Preferences.get({ key: SESSION_TOKEN_KEY })
    sessionTokenCache.value = stored.value || null
  } catch {
    sessionTokenCache.value = null
  }
  return sessionTokenCache.value
}

export async function setSessionToken(token: string | null): Promise<void> {
  if (!isNativePlatform) return
  sessionTokenCache.value = token
  sessionTokenLoaded = true
  try {
    if (token) {
      await Preferences.set({ key: SESSION_TOKEN_KEY, value: token })
    } else {
      await Preferences.remove({ key: SESSION_TOKEN_KEY })
    }
  } catch {
    // Best effort: the backend call that produced the token will still
    // succeed; the next page load just won't auto-recover a session.
  }
}

export async function getSessionToken(): Promise<string | null> {
  if (!isNativePlatform) return null
  return loadNativeSessionToken()
}

type ApiFetchInit = Omit<RequestInit, "body"> & { body?: BodyInit | null }

export async function apiFetch(
  path: string,
  init: ApiFetchInit = {}
): Promise<Response> {
  const url = isNativePlatform && backendUrl ? `${backendUrl}${path}` : path
  const headers = new Headers(init.headers ?? {})
  if (isNativePlatform) {
    const token = await loadNativeSessionToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
  } else {
    // Same-origin on web so cookies ride along.
    headers.set("Accept", headers.get("Accept") ?? "application/json")
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: isNativePlatform ? "omit" : "include",
  })
}
