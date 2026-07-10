const CACHE_VERSION = "anchor-release-v2"
const OFFLINE_URL = "/offline"
const CORE_APP_SHELL = ["/", "/app", OFFLINE_URL]
const OPTIONAL_APP_SHELL = [
  "/morning",
  "/evening",
  "/timeline",
  "/settings",
  "/privacy",
  "/support",
  "/terms",
  "/manifest.webmanifest",
  "/pwa-icon/192",
  "/pwa-icon/512",
  "/pwa-icon/512-maskable",
]

function reloadRequest(url) {
  return new Request(url, { cache: "reload" })
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_VERSION)

  // Keep install strict for the real fallback chain. If these miss, the old
  // worker/cache should stay active instead of replacing a working offline shell.
  await cache.addAll(CORE_APP_SHELL.map(reloadRequest))

  await Promise.all(
    OPTIONAL_APP_SHELL.map((url) =>
      cache.add(reloadRequest(url)).catch(() => undefined)
    )
  )
}

function shouldCacheRequest(request) {
  const url = new URL(request.url)

  return (
    url.origin === self.location.origin &&
    request.method === "GET" &&
    !url.pathname.startsWith("/api/")
  )
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (!shouldCacheRequest(request)) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          return (
            (await caches.match(request)) ??
            (await caches.match(OFFLINE_URL)) ??
            (await caches.match("/app")) ??
            (await caches.match("/"))
          )
        })
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response
        }

        const copy = response.clone()
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
        return response
      })
    })
  )
})
